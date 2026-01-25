/**
 * Users Routes with Firestore
 * Example of how to migrate routes from MongoDB to Firestore
 */

import express from 'express';
import { authenticate, authorize, FirebaseAuthRequest } from '../middleware/firebaseAuth';
import { firestore } from '../config/firebase';
import { firebaseAuth, setUserRole } from '../config/firebase';
import { USERS_COLLECTION, firestoreUserFromDoc, FirestoreUser } from '../models/firestore/User';
import { UserRole } from '../types';

const router = express.Router();

// Get all users (SaaS Admin can see all, Staff/Principal see their school only)
router.get('/', authenticate, async (req: FirebaseAuthRequest, res) => {
  try {
    let query = firestore.collection(USERS_COLLECTION);
    
    // Apply school filter for non-SAAS_ADMIN users
    if (req.user?.role !== UserRole.SAAS_ADMIN && req.user?.schoolId) {
      query = query.where('schoolId', '==', req.user.schoolId) as any;
    }
    
    // Filter by role if provided
    if (req.query.role) {
      query = query.where('role', '==', req.query.role) as any;
    }
    
    const snapshot = await query.get();
    const users = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => firestoreUserFromDoc(doc));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create user (SaaS Admin, Staff, Principal only)
router.post('/', authenticate, async (req: FirebaseAuthRequest, res) => {
  try {
    // Check permissions
    if (req.user?.role !== UserRole.SAAS_ADMIN && 
        req.user?.role !== UserRole.STAFF && 
        req.user?.role !== UserRole.PRINCIPAL) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const {
      email,
      password,
      name,
      role,
      phone,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      children,
      department,
      schoolId // For SaaS Admin to specify school
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Determine schoolId
    const finalSchoolId = req.user?.role === UserRole.SAAS_ADMIN 
      ? (schoolId || req.user?.schoolId)
      : req.user?.schoolId;

    if (role !== UserRole.SAAS_ADMIN && !finalSchoolId) {
      return res.status(400).json({ message: 'schoolId is required for this role' });
    }

    // Create user in Firebase Auth
    const userRecord = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false
    });

    // Set custom claims
    await setUserRole(userRecord.uid, role, finalSchoolId);

    // Create user document in Firestore
    const userData: Omit<FirestoreUser, 'uid' | 'createdAt' | 'updatedAt'> = {
      email,
      name,
      role,
      schoolId: role !== UserRole.SAAS_ADMIN ? finalSchoolId : undefined,
      phone,
      isActive: true,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      department,
      children
    };

    await firestore.collection(USERS_COLLECTION).doc(userRecord.uid).set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      email: userRecord.email
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: FirebaseAuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    if (req.user?.uid !== id && 
        req.user?.role !== UserRole.SAAS_ADMIN && 
        req.user?.role !== UserRole.STAFF && 
        req.user?.role !== UserRole.PRINCIPAL) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const userDoc = await firestore.collection(USERS_COLLECTION).doc(id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = firestoreUserFromDoc(userDoc);
    
    // Check school access
    if (req.user?.role !== UserRole.SAAS_ADMIN && 
        user.schoolId !== req.user?.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticate, async (req: FirebaseAuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    if (req.user?.uid !== id && 
        req.user?.role !== UserRole.SAAS_ADMIN && 
        req.user?.role !== UserRole.PRINCIPAL) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updateData = req.body;
    delete updateData.uid; // Don't allow UID changes
    delete updateData.email; // Email changes should go through Firebase Auth
    delete updateData.role; // Role changes should use admin endpoint

    updateData.updatedAt = new Date();

    await firestore.collection(USERS_COLLECTION).doc(id).update(updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete/Deactivate user
router.delete('/:id', authenticate, authorize(UserRole.PRINCIPAL, UserRole.SAAS_ADMIN), async (req: FirebaseAuthRequest, res) => {
  try {
    const { id } = req.params;

    // Deactivate in Firestore (don't delete from Firebase Auth)
    await firestore.collection(USERS_COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: new Date()
    });

    // Optionally disable in Firebase Auth
    await firebaseAuth.updateUser(id, { disabled: true });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
