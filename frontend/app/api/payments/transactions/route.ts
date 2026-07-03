/**
 * GET /api/payments/transactions — read-only ledger reader (additive; does not
 * modify any existing write path). Powers the parent receipts panel and the
 * admin treasury audit log.
 *
 * Query params:
 *   scope   'me' (default) | 'school'
 *   limit   number (default 100, max 500)
 *   category  optional LedgerTransactionCategory filter
 *
 * scope=me    → transactions touching the caller's own / children's wallets,
 *               plus transactions linked to the caller's Xendit payment attempts.
 * scope=school → transactions touching the school-system wallet (inflows such as
 *               TUITION/STORE and outflows such as disbursements). Requires a
 *               finance/leadership role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  docToJson,
  ledgerTransactionsCollection,
  paymentAttemptsCollection,
  usersCollection,
} from '@/lib/server/firebase-admin';
import {
  parentWalletId,
  schoolSystemWalletId,
  studentWalletId,
} from '@/lib/types/ledger';
import { FINANCE_REPORT_ROLES, UserRole } from '@/lib/types';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
/** Firestore `in` filter supports at most 30 comparison values. */
const IN_CHUNK = 30;

function parseLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function queryByField(
  field: 'sourceWalletId' | 'destinationWalletId' | 'paymentAttemptId',
  values: string[]
): Promise<Record<string, unknown>[]> {
  if (values.length === 0) return [];
  const rows: Record<string, unknown>[] = [];
  for (const group of chunk(values, IN_CHUNK)) {
    const snap = await ledgerTransactionsCollection().where(field, 'in', group).get();
    for (const doc of snap.docs) rows.push(docToJson(doc));
  }
  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) {
      return NextResponse.json({ message: 'School context required' }, { status: 400 });
    }

    const scope = (req.nextUrl.searchParams.get('scope') ?? 'me').toLowerCase();
    const limit = parseLimit(req.nextUrl.searchParams.get('limit'));
    const categoryFilter = req.nextUrl.searchParams.get('category') ?? '';

    const merged = new Map<string, Record<string, unknown>>();

    if (scope === 'school') {
      const canReadSchool = hasFullAccess(auth) || hasAnyRole(auth, FINANCE_REPORT_ROLES);
      if (!canReadSchool) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      const schoolWallet = schoolSystemWalletId(schoolId);
      const [asDest, asSource] = await Promise.all([
        queryByField('destinationWalletId', [schoolWallet]),
        queryByField('sourceWalletId', [schoolWallet]),
      ]);
      for (const row of [...asDest, ...asSource]) merged.set(String(row.id), row);
    } else {
      const walletIds = new Set<string>([parentWalletId(auth.uid), studentWalletId(auth.uid)]);

      // Independent reads — run together instead of one after another.
      const [userDoc, attemptsSnap] = await Promise.all([
        usersCollection().doc(auth.uid).get(),
        paymentAttemptsCollection().where('userId', '==', auth.uid).get(),
      ]);
      const children = ((userDoc.data() as { children?: string[] })?.children ?? []) as string[];
      for (const childId of children) walletIds.add(studentWalletId(String(childId)));

      const attemptIds = attemptsSnap.docs.map((d) => d.id);

      const walletIdList = Array.from(walletIds);
      const [asDest, asSource, byAttempt] = await Promise.all([
        queryByField('destinationWalletId', walletIdList),
        queryByField('sourceWalletId', walletIdList),
        queryByField('paymentAttemptId', attemptIds),
      ]);
      for (const row of [...asDest, ...asSource, ...byAttempt]) merged.set(String(row.id), row);
    }

    let rows = Array.from(merged.values());

    if (categoryFilter) {
      rows = rows.filter((r) => String(r.category ?? '') === categoryFilter);
    }

    rows.sort((a, b) => {
      const ta = new Date(String(a.timestamp ?? 0)).getTime();
      const tb = new Date(String(b.timestamp ?? 0)).getTime();
      return tb - ta;
    });

    return NextResponse.json(rows.slice(0, limit), {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (e) {
    console.error('GET /api/payments/transactions error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
