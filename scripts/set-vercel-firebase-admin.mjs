#!/usr/bin/env node
/**
 * Set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY on Vercel from a service account JSON.
 * Usage: node scripts/set-vercel-firebase-admin.mjs path/to/adminsdk.json [vercel-project-name]
 */
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const jsonPath = process.argv[2];
const project = process.argv[3] || 'kitschool-frontend';

if (!jsonPath) {
  console.error('Usage: node scripts/set-vercel-firebase-admin.mjs <service-account.json> [vercel-project]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(jsonPath, 'utf8'));
const projectId = sa.project_id;
const clientEmail = sa.client_email;
const privateKey = sa.private_key;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Invalid service account JSON');
  process.exit(1);
}

execSync(`vercel link --yes --project ${project}`, { stdio: 'inherit' });

function add(name, value, sensitive = false) {
  const tmp = '/tmp/vercel-env-val.txt';
  writeFileSync(tmp, value);
  const flag = sensitive ? ' --sensitive' : '';
  execSync(
    `vercel env add ${name} production --yes --force --non-interactive${flag} < ${tmp}`,
    { stdio: 'inherit', shell: true }
  );
  unlinkSync(tmp);
}

add('FIREBASE_PROJECT_ID', projectId);
add('FIREBASE_CLIENT_EMAIL', clientEmail);
add('FIREBASE_PRIVATE_KEY', privateKey, true);

console.log(`Done. Redeploy: vercel --prod (project ${project})`);
