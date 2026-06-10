/**
 * Set subdomain for an existing school (e.g. ppst-alum → al-um.kithome.id).
 *
 * Usage (from backend/):
 *   npx tsx src/scripts/patch-school-subdomain.ts
 *   SEED_SCHOOL_ID=ppst-alum SUBDOMAIN=al-um npx tsx src/scripts/patch-school-subdomain.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const SCHOOL_ID = process.env.SEED_SCHOOL_ID || 'ppst-alum';
const SUBDOMAIN = process.env.SUBDOMAIN || 'al-um';

function initFirebase() {
  if (getApps().length) return getFirestore();

  const projectId = process.env.FIREBASE_PROJECT_ID || 'kitschool-b86dd';
  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '../../../kitschool-b86dd-firebase-adminsdk.json');

  if (!fs.existsSync(saPath)) {
    throw new Error(`Service account not found: ${saPath}`);
  }

  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  initializeApp({ credential: cert(sa), projectId });
  return getFirestore();
}

async function main() {
  const db = initFirebase();
  const ref = db.collection('schools').doc(SCHOOL_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`School not found: ${SCHOOL_ID}`);
    process.exit(1);
  }

  await ref.set(
    {
      subdomain: SUBDOMAIN,
      landingPage: {
        ...(snap.data()?.landingPage || {}),
        enabled: true,
        slug: snap.data()?.landingPage?.slug || SCHOOL_ID,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`✓ ${SCHOOL_ID} → subdomain "${SUBDOMAIN}" (https://${SUBDOMAIN}.kithome.id)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
