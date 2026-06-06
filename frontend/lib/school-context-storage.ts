/** Read school id from localStorage (useLocalStorage stores JSON-encoded strings). */
export function getStoredSchoolId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('selectedSchoolId');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'string' && parsed ? parsed : null;
  } catch {
    return raw || null;
  }
}

export function getStoredUnitId(schoolId: string): string | null {
  if (typeof window === 'undefined' || !schoolId) return null;
  return localStorage.getItem(`selectedUnitId:${schoolId}`);
}

export function setStoredUnitId(schoolId: string, unitId: string | null): void {
  if (typeof window === 'undefined' || !schoolId) return;
  const key = `selectedUnitId:${schoolId}`;
  if (unitId) localStorage.setItem(key, unitId);
  else localStorage.removeItem(key);
}
