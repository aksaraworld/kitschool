/**
 * Enable public landing chat + assign CS staff (tu@ school email).
 * Usage: cd backend && npx tsx src/scripts/patch-public-chat-config.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const SCHOOL_ID = process.env.SEED_SCHOOL_ID || 'ppst-alum';
const CS_EMAIL = process.env.CS_EMAIL || 'tu@ppst-alum.sch.id';

function initFirebase() {
  if (getApps().length) return getFirestore();
  const projectId = process.env.FIREBASE_PROJECT_ID || 'kitschool-b86dd';
  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '../../../kitschool-b86dd-firebase-adminsdk.json');
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  initializeApp({ credential: cert(sa), projectId });
  return getFirestore();
}

async function main() {
  const db = initFirebase();
  const users = await db.collection('users').where('email', '==', CS_EMAIL).limit(1).get();
  if (users.empty) {
    console.error(`User not found: ${CS_EMAIL}`);
    process.exit(1);
  }
  const csUid = users.docs[0]!.id;

  await db.collection('schools').doc(SCHOOL_ID).set(
    {
      customerServiceStaffId: csUid,
      landingPage: {
        publicChatEnabled: true,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`✓ ${SCHOOL_ID} → CS ${CS_EMAIL} (${csUid}), publicChatEnabled`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
