/**
 * Firestore User Model
 * User data stored in Firestore (additional data beyond Firebase Auth)
 */

import { UserRole } from '../../types';

export interface FirestoreUser {
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string; // Required for all roles except SAAS_ADMIN
  phone?: string;
  avatar?: string;
  isActive: boolean;
  
  // Student specific
  studentId?: string;
  classId?: string;
  year?: number;
  major?: string;
  
  // Parent specific
  children?: string[]; // Array of student UIDs
  
  // Teacher specific
  teacherId?: string;
  assignedClasses?: string[]; // Array of class IDs
  isHomeroom?: boolean;
  homeroomClassId?: string;
  
  // Staff/Principal/Finance
  employeeId?: string;
  department?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Firestore collection name
export const USERS_COLLECTION = 'users';

// Helper to convert Firestore document to FirestoreUser
export function firestoreUserFromDoc(doc: any): FirestoreUser {
  const data = doc.data();
  return {
    uid: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date()
  };
}
