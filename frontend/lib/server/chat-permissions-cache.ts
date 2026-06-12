/** Short-lived in-memory cache for chat permission lookups (per serverless instance). */

const TTL_MS = 3 * 60 * 1000;
const MAX_ENTRIES = 400;

type CacheEntry<T> = { value: T; expires: number };

const allowedIdsCache = new Map<string, CacheEntry<Set<string>>>();
const recipientManifestCache = new Map<
  string,
  CacheEntry<{ uid: string; name?: string; email?: string; role?: string }[]>
>();

function prune<T>(map: Map<string, CacheEntry<T>>) {
  if (map.size <= MAX_ENTRIES) return;
  const first = map.keys().next().value;
  if (first) map.delete(first);
}

export function getCachedAllowedIds(key: string): Set<string> | null {
  const entry = allowedIdsCache.get(key);
  if (!entry || Date.now() > entry.expires) {
    allowedIdsCache.delete(key);
    return null;
  }
  return new Set(entry.value);
}

export function setCachedAllowedIds(key: string, ids: Set<string>): void {
  allowedIdsCache.set(key, { value: new Set(ids), expires: Date.now() + TTL_MS });
  prune(allowedIdsCache);
}

export function getCachedRecipientManifest(
  key: string
): { uid: string; name?: string; email?: string; role?: string }[] | null {
  const entry = recipientManifestCache.get(key);
  if (!entry || Date.now() > entry.expires) {
    recipientManifestCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedRecipientManifest(
  key: string,
  manifest: { uid: string; name?: string; email?: string; role?: string }[]
): void {
  recipientManifestCache.set(key, { value: manifest, expires: Date.now() + TTL_MS });
  prune(recipientManifestCache);
}

export function cacheKey(schoolId: string, uid: string): string {
  return `${schoolId}:${uid}`;
}
