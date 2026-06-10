/**
 * Platform hosts (kitschool admin) vs per-school subdomains / custom domains.
 *
 * kithome.id apex is KitHome (property app) — NOT kitschool platform.
 * Platform admin stays on kitschool.vercel.app.
 * School tenants: {subdomain}.kithome.id only.
 */

const DEFAULT_PLATFORM_HOSTS = [
  'localhost',
  '127.0.0.1',
  'kitschool.vercel.app',
  'kitschool-frontend.vercel.app',
];

/** Reserved on SCHOOL_DOMAIN_BASE — not assignable to schools. */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'api', 'mail', 'staging', 'dev', 'cdn']);

export function normalizeHost(host: string): string {
  return host.toLowerCase().split(':')[0].trim();
}

export function getSchoolDomainBase(): string | null {
  const base =
    process.env.NEXT_PUBLIC_SCHOOL_DOMAIN_BASE?.trim().toLowerCase() ||
    process.env.SCHOOL_DOMAIN_BASE?.trim().toLowerCase() ||
    '';
  return base || null;
}

export function getPlatformSubdomains(): Set<string> {
  const extra = process.env.NEXT_PUBLIC_PLATFORM_SUBDOMAINS || process.env.PLATFORM_SUBDOMAINS || '';
  return new Set(
    extra
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getPlatformHosts(): Set<string> {
  const extra = process.env.NEXT_PUBLIC_PLATFORM_HOSTS || process.env.PLATFORM_HOSTS || '';
  const fromEnv = extra
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const hosts = new Set([...DEFAULT_PLATFORM_HOSTS, ...fromEnv]);

  // Optional: platform on a subdomain of SCHOOL_DOMAIN_BASE (e.g. app.kithome.id)
  const base = getSchoolDomainBase();
  if (base) {
    for (const sub of getPlatformSubdomains()) {
      hosts.add(`${sub}.${base}`);
    }
  }

  return hosts;
}

/** e.g. al-um from al-um.kithome.id */
export function parseSchoolSubdomain(host: string): string | null {
  const base = getSchoolDomainBase();
  if (!base) return null;

  const h = normalizeHost(host);
  const suffix = `.${base}`;
  if (!h.endsWith(suffix) || h.length <= suffix.length) return null;

  const sub = h.slice(0, -suffix.length);
  if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null;
  if (getPlatformSubdomains().has(sub)) return null;

  return sub;
}

export function schoolSubdomainUrl(subdomain: string): string {
  const base = getSchoolDomainBase();
  if (!base || !subdomain) return '';
  return `https://${subdomain}.${base}`;
}

/** True when request is on kitschool platform domain (not a school tenant host). */
export function isPlatformHost(host: string): boolean {
  const h = normalizeHost(host);
  if (!h) return true;
  if (getPlatformHosts().has(h)) return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

export function getPlatformUrl(): string {
  const url = process.env.NEXT_PUBLIC_PLATFORM_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  return 'https://kitschool.vercel.app';
}
