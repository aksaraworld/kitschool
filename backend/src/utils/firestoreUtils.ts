import { firestore } from '../config/firebase';

export type AnyDoc = Record<string, any>;

export function isFirestoreTimestamp(v: any): v is FirebaseFirestore.Timestamp {
  return !!v && typeof v.toDate === 'function' && typeof v.seconds === 'number';
}

export function deepConvertTimestamps(value: any): any {
  if (value === null || value === undefined) return value;
  if (isFirestoreTimestamp(value)) return value.toDate();
  if (Array.isArray(value)) return value.map(deepConvertTimestamps);
  if (typeof value === 'object') {
    const out: AnyDoc = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepConvertTimestamps(v);
    return out;
  }
  return value;
}

export function docToJson(doc: FirebaseFirestore.DocumentSnapshot): AnyDoc {
  return { id: doc.id, ...deepConvertTimestamps(doc.data() || {}) };
}

export async function getDocsByIds(collection: string, ids: string[]): Promise<Map<string, AnyDoc>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const out = new Map<string, AnyDoc>();
  if (unique.length === 0) return out;

  // Firestore getAll has argument length limits; chunk it.
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const refs = chunk.map((id) => firestore.collection(collection).doc(id));
    const snaps = await firestore.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) out.set(snap.id, docToJson(snap));
    }
  }
  return out;
}

