/**
 * Migration Script: MongoDB -> Firestore (+ optional Firebase Storage)
 *
 * What it does:
 * - Migrates ALL Mongo collections in `backend/src/models/*` into Firestore collections
 * - Migrates Users into Firebase Auth + Firestore `users` (doc id = Firebase UID)
 * - Builds a mapping from Mongo User _id -> Firebase UID so other collections can reference users correctly
 * - Optionally uploads referenced files (avatar/logo/receipts/attachments) into Firebase Storage
 *
 * Usage:
 *   cd backend
 *   npm run migrate:firebase:all
 *
 * Options (env):
 *   MIGRATE_STORAGE=true           # try to upload/copy file URLs into Firebase Storage
 *   STORAGE_PREFIX=migration       # base folder in bucket
 *   MIGRATE_AUTH=false             # skip Firebase Auth + custom claims (Firestore-only migration)
 *
 * Notes:
 * - This is designed to be re-runnable (uses deterministic doc ids; sets with merge)
 * - Passwords cannot be migrated; existing Firebase Auth users are re-used by email
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';
import admin from 'firebase-admin';

import User from '../models/User';
import School from '../models/School';
import Major from '../models/Major';
import Year from '../models/Year';
import ClassModel from '../models/Class';
import Attendance from '../models/Attendance';
import Schedule from '../models/Schedule';
import Communication from '../models/Communication';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import PaymentAttempt from '../models/PaymentAttempt';
import TransactionFee from '../models/TransactionFee';
import StudentActivity from '../models/StudentActivity';
import Configuration from '../models/Configuration';

import { firebaseAuth, firestore, setUserRole } from '../config/firebase';
import { USERS_COLLECTION } from '../models/firestore/User';

const MIGRATE_STORAGE = String(process.env.MIGRATE_STORAGE || '').toLowerCase() === 'true';
const STORAGE_PREFIX = process.env.STORAGE_PREFIX || 'migration';
const MIGRATE_AUTH = String(process.env.MIGRATE_AUTH || 'true').toLowerCase() !== 'false';
const AUTH_TIMEOUT_MS = Number(process.env.AUTH_TIMEOUT_MS || 20000);
const AUTH_LOG_EVERY = Number(process.env.AUTH_LOG_EVERY || 25);

function oid(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v?.toString === 'function') return v.toString();
  return undefined;
}

function safeDate(v: any): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function looksLikeMongoObjectId(v: any): boolean {
  return (
    !!v &&
    (v?._bsontype === 'ObjectID' ||
      v?._bsontype === 'ObjectId' ||
      v?.constructor?.name === 'ObjectId' ||
      v?.constructor?.name === 'ObjectID')
  );
}

function toFirestoreValue(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (looksLikeMongoObjectId(value)) return String(value);
  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    const mapped = value.map((v) => toFirestoreValue(v)).filter((v) => v !== undefined);
    return mapped;
  }

  if (typeof value === 'object') {
    // Drop Mongo internals and undefined recursively
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '_id' || k === '__v') continue;
      const fv = toFirestoreValue(v);
      if (fv === undefined) continue;
      out[k] = fv;
    }
    return out;
  }

  return value;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms (${label})`)), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function isTransientAuthError(err: any) {
  const code = err?.code || err?.errorInfo?.code;
  const msg = String(err?.message || '');
  return (
    code === 'auth/internal-error' ||
    code === 'auth/network-request-failed' ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNRESET') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

async function getOrCreateAuthUser(params: { email: string; name: string; disabled?: boolean }) {
  if (!MIGRATE_AUTH) {
    throw new Error('getOrCreateAuthUser() called while MIGRATE_AUTH=false');
  }

  const { email, name, disabled } = params;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const existing = await withTimeout(firebaseAuth.getUserByEmail(email), AUTH_TIMEOUT_MS, `getUserByEmail:${email}`);
      if (existing.displayName !== name || (disabled !== undefined && existing.disabled !== disabled)) {
        await withTimeout(
          firebaseAuth.updateUser(existing.uid, { displayName: name, disabled }),
          AUTH_TIMEOUT_MS,
          `updateUser:${existing.uid}`
        );
      }
      return existing;
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') break;
      if (isTransientAuthError(err) && attempt < 3) {
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }
  }

  // Cannot migrate password; create with temp password so user can reset.
  const tempPassword = `Temp${Date.now()}${Math.random().toString(36).slice(2)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await withTimeout(
        firebaseAuth.createUser({
          email,
          password: tempPassword,
          displayName: name,
          disabled: Boolean(disabled),
          emailVerified: false,
        }),
        AUTH_TIMEOUT_MS,
        `createUser:${email}`
      );
    } catch (err: any) {
      if (isTransientAuthError(err) && attempt < 3) {
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }
  }

  // unreachable
  throw new Error('Failed to create auth user');
}

function isHttpUrl(s?: string) {
  return !!s && (s.startsWith('http://') || s.startsWith('https://'));
}

function isFirebaseStorageUrl(s?: string) {
  return !!s && (s.startsWith('gs://') || s.includes('firebasestorage.googleapis.com'));
}

async function uploadToStorage(params: {
  source: string;
  destPath: string;
  contentTypeHint?: string;
}): Promise<string> {
  const { source, destPath, contentTypeHint } = params;

  if (!admin.apps.length) {
    throw new Error('firebase-admin not initialized (storage)');
  }

  const bucket = admin.storage().bucket();
  const token = crypto.randomUUID();

  let buffer: Buffer;
  let contentType = contentTypeHint;

  if (isHttpUrl(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to download ${source}: ${res.status} ${res.statusText}`);
    const arr = await res.arrayBuffer();
    buffer = Buffer.from(arr);
    contentType = contentType || res.headers.get('content-type') || undefined;
  } else {
    // local path (best effort)
    const fs = await import('fs');
    if (!fs.existsSync(source)) throw new Error(`File not found: ${source}`);
    buffer = fs.readFileSync(source);
  }

  const file = bucket.file(destPath);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const encodedPath = encodeURIComponent(destPath).replace(/%2F/g, '%2F');
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
  return downloadUrl;
}

async function maybeMigrateFileUrl(source?: string, destPath?: string): Promise<string | undefined> {
  if (!source || !destPath) return source;
  if (!MIGRATE_STORAGE) return source;
  if (isFirebaseStorageUrl(source)) return source;

  try {
    return await uploadToStorage({ source, destPath });
  } catch (e: any) {
    console.warn(`⚠️  Storage migrate skipped (${source}): ${e?.message || e}`);
    return source;
  }
}

async function batchSet(collection: string, docs: Array<{ id: string; data: any }>) {
  const col = firestore.collection(collection);
  for (let i = 0; i < docs.length; i += 400) {
    const slice = docs.slice(i, i + 400);
    const batch = firestore.batch();
    for (const d of slice) {
      batch.set(col.doc(d.id), toFirestoreValue(d.data), { merge: true });
    }
    await batch.commit();
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sekolahkita';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  if (!firestore) {
    throw new Error('Firebase Admin not initialized. Check FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_PATH');
  }
  if (MIGRATE_AUTH && !firebaseAuth) {
    throw new Error('Firebase Auth not initialized but MIGRATE_AUTH=true');
  }
  console.log(`✅ Firebase Admin ready (auth migration: ${MIGRATE_AUTH ? 'enabled' : 'disabled'})`);

  // ---------- 1) Schools (doc id = mongo _id) ----------
  const schools = await School.find({}).lean();
  console.log(`📊 Found ${schools.length} schools`);
  await batchSet(
    'schools',
    await Promise.all(
      schools.map(async (s: any) => {
        const id = oid(s._id)!;
        const logo = await maybeMigrateFileUrl(
          s.logo,
          `${STORAGE_PREFIX}/schools/${id}/logo`
        );
        return {
          id,
          data: {
            ...s,
            _id: undefined,
            id,
            logo,
            createdBy: oid(s.createdBy),
            createdAt: safeDate(s.createdAt) || new Date(),
            updatedAt: safeDate(s.updatedAt) || new Date(),
          },
        };
      })
    )
  );
  console.log('✅ Migrated schools');

  // ---------- 2) Users -> Firebase Auth + Firestore users ----------
  const users = await User.find({}).lean();
  console.log(`📊 Found ${users.length} users`);

  const mongoUserIdToUid = new Map<string, string>();

  for (let i = 0; i < users.length; i++) {
    const u = users[i] as any;
    const mongoId = oid((u as any)._id)!;
    const email = (u as any).email;
    const name = (u as any).name;
    const role = (u as any).role;
    const schoolId = oid((u as any).schoolId);

    if (i % AUTH_LOG_EVERY === 0) {
      console.log(`👤 Users ${i + 1}/${users.length}... (${email})`);
    }

    let uid: string;
    try {
      uid = MIGRATE_AUTH ? (await getOrCreateAuthUser({ email, name, disabled: !(u as any).isActive })).uid : mongoId;
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('serviceusage.services.use') || msg.includes('identitytoolkit.googleapis.com') || msg.includes('USER_PROJECT_DENIED')) {
        throw new Error(
          `Firebase Auth permission denied for project. Fix IAM (Service Usage Consumer) or rerun with MIGRATE_AUTH=false. Original: ${msg}`
        );
      }
      throw err;
    }
    mongoUserIdToUid.set(mongoId, uid);

    if (MIGRATE_AUTH) {
      await setUserRole(uid, role, role === 'saas_admin' ? undefined : schoolId);
    }

    const avatar = await maybeMigrateFileUrl((u as any).avatar, `${STORAGE_PREFIX}/users/${uid}/avatar`);

    await firestore.collection(USERS_COLLECTION).doc(uid).set(
      toFirestoreValue({
        mongoId,
        uid: MIGRATE_AUTH ? uid : undefined,
        email,
        name,
        role,
        schoolId: role === 'saas_admin' ? undefined : schoolId,
        phone: (u as any).phone,
        avatar,
        isActive: Boolean((u as any).isActive),
        studentId: (u as any).studentId,
        teacherId: (u as any).teacherId,
        employeeId: (u as any).employeeId,
        classId: oid((u as any).classId),
        year: (u as any).year,
        major: (u as any).major,
        department: (u as any).department,
        children: Array.isArray((u as any).children)
          ? (u as any).children.map((x: any) => mongoUserIdToUid.get(oid(x) || '') || oid(x)).filter(Boolean)
          : undefined,
        assignedClasses: Array.isArray((u as any).assignedClasses)
          ? (u as any).assignedClasses.map((x: any) => oid(x)).filter(Boolean)
          : undefined,
        isHomeroom: (u as any).isHomeroom,
        homeroomClassId: oid((u as any).homeroomClassId),
        createdAt: safeDate((u as any).createdAt) || new Date(),
        updatedAt: safeDate((u as any).updatedAt) || new Date(),
      }),
      { merge: true }
    );
  }
  console.log(`✅ Migrated users -> ${MIGRATE_AUTH ? 'Firebase Auth + ' : ''}Firestore users`);

  const mapUser = (mongoIdValue: any) => {
    const id = oid(mongoIdValue);
    if (!id) return undefined;
    return mongoUserIdToUid.get(id) || id;
  };

  // ---------- 3) Simple school-scoped collections ----------
  const years = await Year.find({}).lean();
  await batchSet(
    'years',
    years.map((y: any) => ({
      id: oid(y._id)!,
      data: {
        ...y,
        id: oid(y._id),
        schoolId: oid(y.schoolId),
        _id: undefined,
        createdAt: safeDate(y.createdAt) || new Date(),
        updatedAt: safeDate(y.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated years');

  const majors = await Major.find({}).lean();
  await batchSet(
    'majors',
    majors.map((m: any) => ({
      id: oid(m._id)!,
      data: {
        ...m,
        id: oid(m._id),
        schoolId: oid(m.schoolId),
        _id: undefined,
        createdAt: safeDate(m.createdAt) || new Date(),
        updatedAt: safeDate(m.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated majors');

  const classes = await ClassModel.find({}).lean();
  await batchSet(
    'classes',
    classes.map((c: any) => ({
      id: oid(c._id)!,
      data: {
        ...c,
        id: oid(c._id),
        schoolId: oid(c.schoolId),
        yearId: oid(c.yearId),
        majorId: oid(c.majorId),
        homeroomTeacherId: mapUser(c.homeroomTeacherId),
        studentIds: Array.isArray(c.studentIds) ? c.studentIds.map(mapUser).filter(Boolean) : [],
        _id: undefined,
        createdAt: safeDate(c.createdAt) || new Date(),
        updatedAt: safeDate(c.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated classes');

  const schedules = await Schedule.find({}).lean();
  await batchSet(
    'schedules',
    schedules.map((s: any) => ({
      id: oid(s._id)!,
      data: {
        ...s,
        id: oid(s._id),
        schoolId: oid(s.schoolId),
        classId: oid(s.classId),
        createdBy: mapUser(s.createdBy),
        _id: undefined,
        createdAt: safeDate(s.createdAt) || new Date(),
        updatedAt: safeDate(s.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated schedules');

  const attendance = await Attendance.find({}).lean();
  await batchSet(
    'attendance',
    attendance.map((a: any) => ({
      id: oid(a._id)!,
      data: {
        ...a,
        id: oid(a._id),
        schoolId: oid(a.schoolId),
        userId: mapUser(a.userId),
        classId: oid(a.classId),
        _id: undefined,
        createdAt: safeDate(a.createdAt) || new Date(),
        updatedAt: safeDate(a.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated attendance');

  const invoices = await Invoice.find({}).lean();
  await batchSet(
    'invoices',
    invoices.map((inv: any) => ({
      id: oid(inv._id)!,
      data: {
        ...inv,
        id: oid(inv._id),
        schoolId: oid(inv.schoolId),
        studentId: mapUser(inv.studentId),
        parentId: mapUser(inv.parentId),
        createdBy: mapUser(inv.createdBy),
        _id: undefined,
        createdAt: safeDate(inv.createdAt) || new Date(),
        updatedAt: safeDate(inv.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated invoices');

  const payments = await Payment.find({}).lean();
  await batchSet(
    'payments',
    await Promise.all(
      payments.map(async (p: any) => {
        const id = oid(p._id)!;
        const receiptUrl = await maybeMigrateFileUrl(
          p.receiptUrl,
          `${STORAGE_PREFIX}/payments/${id}/receipt`
        );
        return {
          id,
          data: {
            ...p,
            id,
            schoolId: oid(p.schoolId),
            studentId: mapUser(p.studentId),
            parentId: mapUser(p.parentId),
            receiptUrl,
            _id: undefined,
            createdAt: safeDate(p.createdAt) || new Date(),
            updatedAt: safeDate(p.updatedAt) || new Date(),
          },
        };
      })
    )
  );
  console.log('✅ Migrated payments');

  const paymentAttempts = await PaymentAttempt.find({}).lean();
  await batchSet(
    'paymentAttempts',
    await Promise.all(
      paymentAttempts.map(async (p: any) => {
        const id = oid(p._id)!;
        const receiptUrl = await maybeMigrateFileUrl(
          p.receiptUrl,
          `${STORAGE_PREFIX}/paymentAttempts/${id}/receipt`
        );
        const proofOfPayment = await maybeMigrateFileUrl(
          p.proofOfPayment,
          `${STORAGE_PREFIX}/paymentAttempts/${id}/proof`
        );
        return {
          id,
          data: {
            ...p,
            id,
            schoolId: oid(p.schoolId),
            invoiceId: oid(p.invoiceId),
            studentId: mapUser(p.studentId),
            parentId: mapUser(p.parentId),
            receiptUrl,
            proofOfPayment,
            _id: undefined,
            createdAt: safeDate(p.createdAt) || new Date(),
            updatedAt: safeDate(p.updatedAt) || new Date(),
          },
        };
      })
    )
  );
  console.log('✅ Migrated paymentAttempts');

  const comms = await Communication.find({}).lean();
  await batchSet(
    'communications',
    await Promise.all(
      comms.map(async (c: any) => {
        const id = oid(c._id)!;
        const attachments = Array.isArray(c.attachments)
          ? await Promise.all(
              c.attachments.map((att: string, idx: number) =>
                maybeMigrateFileUrl(att, `${STORAGE_PREFIX}/communications/${id}/att_${idx}`)
              )
            )
          : [];
        return {
          id,
          data: {
            ...c,
            id,
            schoolId: oid(c.schoolId),
            from: mapUser(c.from),
            to: mapUser(c.to),
            parentMessageId: oid(c.parentMessageId),
            attachments,
            _id: undefined,
            createdAt: safeDate(c.createdAt) || new Date(),
            updatedAt: safeDate(c.updatedAt) || new Date(),
          },
        };
      })
    )
  );
  console.log('✅ Migrated communications');

  const txFees = await TransactionFee.find({}).lean();
  await batchSet(
    'transactionFees',
    txFees.map((t: any) => ({
      id: oid(t._id)!,
      data: {
        ...t,
        id: oid(t._id),
        schoolId: oid(t.schoolId),
        invoiceId: oid(t.invoiceId),
        _id: undefined,
        createdAt: safeDate(t.createdAt) || new Date(),
        updatedAt: safeDate(t.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated transactionFees');

  const activities = await StudentActivity.find({}).lean();
  await batchSet(
    'studentActivities',
    activities.map((a: any) => ({
      id: oid(a._id)!,
      data: {
        ...a,
        id: oid(a._id),
        schoolId: oid(a.schoolId),
        studentId: mapUser(a.studentId),
        classId: oid(a.classId),
        createdBy: mapUser(a.createdBy),
        _id: undefined,
        createdAt: safeDate(a.createdAt) || new Date(),
        updatedAt: safeDate(a.updatedAt) || new Date(),
      },
    }))
  );
  console.log('✅ Migrated studentActivities');

  const configs = await Configuration.find({}).lean();
  await batchSet(
    'config',
    configs.map((c: any) => ({
      // Use config key as document id for stable lookups
      id: String(c.key),
      data: {
        key: c.key,
        value: c.value,
        description: c.description,
        type: c.type,
        updatedBy: mapUser(c.updatedBy),
        createdAt: safeDate(c.createdAt) || new Date(),
        updatedAt: safeDate(c.updatedAt) || new Date(),
        legacyMongoId: oid(c._id),
      },
    }))
  );
  console.log('✅ Migrated config');

  await mongoose.disconnect();
  console.log('\n✅ Migration complete!');
  console.log(`Storage migration: ${MIGRATE_STORAGE ? 'enabled' : 'disabled'}`);
}

main().catch(async (e) => {
  console.error('❌ Migration failed:', e?.message || e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

