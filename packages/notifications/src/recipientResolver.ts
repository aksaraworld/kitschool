/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { DatabaseAdapter, ResidentInfo } from './types';

/**
 * Get resident userId from resident document
 * Tries multiple field names to find the userId
 */
export function getResidentUserId(residentData: any): string | null {
  if (!residentData) return null;
  return residentData.user || residentData.userId || residentData.uid || residentData._id || null;
}

/**
 * Get users by role and property
 */
export async function getUsersByRole(
  database: DatabaseAdapter,
  role: string,
  propertyId?: string
): Promise<string[]> {
  try {
    let query = database.collection('users')
      .where('role', '==', role)
      .where('isActive', '==', true);
    
    if (propertyId && role !== 'super_admin') {
      query = query.where('propertyId', '==', propertyId);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error(`Error getting users by role ${role}:`, error);
    return [];
  }
}

/**
 * Get residents by property
 * Handles multiple field name variations for propertyId and userId
 */
export async function getResidentsByProperty(
  database: DatabaseAdapter,
  propertyId: string,
  options?: {
    propertyIdField?: string | string[];
    userIdField?: string | string[];
  }
): Promise<ResidentInfo[]> {
  try {
    const propertyIdFields = options?.propertyIdField 
      ? (Array.isArray(options.propertyIdField) ? options.propertyIdField : [options.propertyIdField])
      : ['propertyId', 'property'];
    
    const userIdFields = options?.userIdField
      ? (Array.isArray(options.userIdField) ? options.userIdField : [options.userIdField])
      : ['user', 'userId', 'uid', '_id'];
    
    // Try all propertyId field variations
    const queries = propertyIdFields.map(field =>
      database.collection('residents')
        .where(field, '==', propertyId)
        .get()
        .catch(() => ({ docs: [] }))
    );
    
    const snapshots = await Promise.all(queries);
    
    // Combine results and deduplicate by document ID
    const allDocs = new Map();
    
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        if (!allDocs.has(doc.id)) {
          allDocs.set(doc.id, doc);
        }
      });
    });
    
    const residents: ResidentInfo[] = Array.from(allDocs.values()).map(doc => {
      const data = doc.data();
      
      // Try all userId field variations
      let userId = '';
      for (const field of userIdFields) {
        if (data[field]) {
          userId = data[field];
          break;
        }
      }
      
      return {
        userId,
        residentId: doc.id,
        block: data.block || '',
        ...data
      };
    }).filter(r => r.userId); // Only include residents with a valid userId
    
    return residents;
  } catch (error) {
    console.error('Error getting residents by property:', error);
    return [];
  }
}

/**
 * Get active security staff for a property
 */
export async function getActiveSecurity(
  database: DatabaseAdapter,
  propertyId: string
): Promise<string[]> {
  try {
    const snapshot = await database.collection('users')
      .where('role', '==', 'security')
      .where('propertyId', '==', propertyId)
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error getting active security:', error);
    return [];
  }
}
