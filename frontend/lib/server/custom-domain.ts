/**
 * Per-school host resolution (subdomain + optional custom domain).
 */

import { schoolsCollection } from '@/lib/server/firebase-admin';
import { normalizeHost, parseSchoolSubdomain } from '@/lib/platform-hosts';

export function normalizeCustomDomain(input: string | undefined | null): string | undefined {
  if (!input?.trim()) return undefined;
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.split('/')[0]?.split(':')[0] ?? '';
  d = d.replace(/\.$/, '');
  return d || undefined;
}

export function normalizeSubdomain(input: string | undefined | null): string | undefined {
  if (!input?.trim()) return undefined;
  const s = input.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s)) {
    throw new Error('Subdomain hanya huruf kecil, angka, dan tanda hubung');
  }
  return s;
}

export type ResolvedSchoolHost = {
  schoolId: string;
  slug: string;
  subdomain?: string;
  name: string;
  shortName?: string;
  logo?: string;
  tagline?: string;
};

function docToResolved(doc: { id: string; data: () => Record<string, unknown> }): ResolvedSchoolHost | null {
  const data = doc.data();
  const landing = data.landingPage as { slug?: string; heroSubtitle?: string } | undefined;
  const slug = landing?.slug;
  if (!slug) return null;

  return {
    schoolId: doc.id,
    slug,
    subdomain: data.subdomain as string | undefined,
    name: (data.name as string) ?? '',
    shortName: data.shortName as string | undefined,
    logo: data.logo as string | undefined,
    tagline: landing?.heroSubtitle,
  };
}

async function resolveSchoolBySubdomain(subdomain: string): Promise<ResolvedSchoolHost | null> {
  let snap = await schoolsCollection()
    .where('subdomain', '==', subdomain)
    .where('landingPage.enabled', '==', true)
    .limit(1)
    .get();

  if (snap.empty) {
    snap = await schoolsCollection()
      .where('landingPage.slug', '==', subdomain)
      .where('landingPage.enabled', '==', true)
      .limit(1)
      .get();
  }

  if (snap.empty) return null;
  return docToResolved(snap.docs[0]!);
}

export async function resolveSchoolByHost(host: string): Promise<ResolvedSchoolHost | null> {
  const normalized = normalizeHost(host);
  if (!normalized) return null;

  const subdomain = parseSchoolSubdomain(normalized);
  if (subdomain) {
    return resolveSchoolBySubdomain(subdomain);
  }

  const snap = await schoolsCollection()
    .where('customDomain', '==', normalized)
    .where('landingPage.enabled', '==', true)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docToResolved(snap.docs[0]!);
}

export async function assertUniqueCustomDomain(
  domain: string | undefined | null,
  schoolId: string
): Promise<string | undefined> {
  const normalized = normalizeCustomDomain(domain);
  if (!normalized) return undefined;

  const snap = await schoolsCollection().where('customDomain', '==', normalized).limit(2).get();
  const conflict = snap.docs.find((d) => d.id !== schoolId);
  if (conflict) {
    throw new Error(`Domain "${normalized}" sudah dipakai sekolah lain`);
  }
  return normalized;
}

export async function assertUniqueSubdomain(
  subdomain: string | undefined | null,
  schoolId: string
): Promise<string | undefined> {
  const normalized = normalizeSubdomain(subdomain);
  if (!normalized) return undefined;

  const bySub = await schoolsCollection().where('subdomain', '==', normalized).limit(2).get();
  const subConflict = bySub.docs.find((d) => d.id !== schoolId);
  if (subConflict) {
    throw new Error(`Subdomain "${normalized}" sudah dipakai sekolah lain`);
  }

  const bySlug = await schoolsCollection()
    .where('landingPage.slug', '==', normalized)
    .where('landingPage.enabled', '==', true)
    .limit(2)
    .get();
  const slugConflict = bySlug.docs.find((d) => d.id !== schoolId);
  if (slugConflict) {
    throw new Error(`Subdomain "${normalized}" bentrok dengan landing slug sekolah lain`);
  }

  return normalized;
}
