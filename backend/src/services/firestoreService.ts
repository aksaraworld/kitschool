/**
 * Firestore Service
 * Common Firestore operations for replacing MongoDB queries
 */

import { firestore } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Generic Firestore CRUD operations
 */
export class FirestoreService<T> {
  constructor(private collectionName: string) {}

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<T | null> {
    const doc = await firestore.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as T;
  }

  /**
   * Get all documents with optional query
   */
  async getAll(query?: (ref: FirebaseFirestore.Query) => FirebaseFirestore.Query): Promise<T[]> {
    let ref: FirebaseFirestore.Query = firestore.collection(this.collectionName);
    
    if (query) {
      ref = query(ref);
    }
    
    const snapshot = await ref.get();
    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as T));
  }

  /**
   * Create document
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = firestore.collection(this.collectionName).doc();
    await docRef.set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Update document
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    await firestore.collection(this.collectionName).doc(id).update({
      ...data,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
    await firestore.collection(this.collectionName).doc(id).delete();
  }

  /**
   * Query by field
   */
  async queryByField(field: string, value: any): Promise<T[]> {
    const snapshot = await firestore
      .collection(this.collectionName)
      .where(field, '==', value)
      .get();
    
    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as T));
  }

  /**
   * Query by multiple fields
   */
  async queryByFields(filters: Record<string, any>): Promise<T[]> {
    let query: FirebaseFirestore.Query = firestore.collection(this.collectionName);
    
    Object.entries(filters).forEach(([field, value]) => {
      query = query.where(field, '==', value);
    });
    
    const snapshot = await query.get();
    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as T));
  }

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    const doc = await firestore.collection(this.collectionName).doc(id).get();
    return doc.exists;
  }
}

/**
 * Helper to convert Firestore timestamp to Date
 */
export function firestoreTimestampToDate(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
}

/**
 * Helper to convert Date to Firestore timestamp
 */
export function dateToFirestoreTimestamp(date: Date) {
  return FieldValue.serverTimestamp();
}
