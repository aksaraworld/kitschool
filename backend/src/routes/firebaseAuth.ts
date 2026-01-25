/**
 * Firebase Authentication Routes
 * Handles login, registration, and user management with Firebase Auth
 */

import express from 'express';
import { firebaseAuth, firestore, setUserRole, verifyFirebaseToken } from '../config/firebase';
import { USERS_COLLECTION, firestoreUserFromDoc, FirestoreUser } from '../models/firestore/User';
import { UserRole } from '../types';

const router = express.Router();

/**
 * Register new user
 * Creates user in Firebase Auth and Firestore
 */
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
      schoolId,
      phone,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      department
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Validate schoolId for non-SAAS_ADMIN users
    if (role !== UserRole.SAAS_ADMIN && !schoolId) {
      return res.status(400).json({ message: 'schoolId is required for this role' });
    }

    // Create user in Firebase Auth
    const userRecord = await firebaseAuth.createUser({
      email,
      password,
      displayName: name,
      disabled: false
    });

    // Set custom claims (role and schoolId)
    await setUserRole(userRecord.uid, role, schoolId);

    // Create user document in Firestore
    const userData: Omit<FirestoreUser, 'uid' | 'createdAt' | 'updatedAt'> = {
      email,
      name,
      role,
      schoolId: role !== UserRole.SAAS_ADMIN ? schoolId : undefined,
      phone,
      isActive: true,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      department
    };

    await firestore.collection(USERS_COLLECTION).doc(userRecord.uid).set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Get custom token for immediate login (optional)
    // const customToken = await firebaseAuth.createCustomToken(userRecord.uid);

    res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid,
      email: userRecord.email
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Get current user from Firestore
 * Client sends Firebase ID token, we verify and return user data
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decodedToken = await verifyFirebaseToken(idToken);

    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get user from Firestore
    const userDoc = await firestore.collection(USERS_COLLECTION).doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = firestoreUserFromDoc(userDoc);

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Get school info if applicable
    let school = null;
    if (user.schoolId) {
      const schoolDoc = await firestore.collection('schools').doc(user.schoolId).get();
      if (schoolDoc.exists) {
        school = {
          id: schoolDoc.id,
          ...schoolDoc.data()
        };
      }
    }

    res.json({
      ...user,
      school: school ? {
        id: school.id,
        name: school.name,
        subscriptionStatus: school.subscriptionStatus,
        subscriptionPlan: school.subscriptionPlan
      } : null
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update user
 */
router.put('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decodedToken = await verifyFirebaseToken(idToken);

    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const updateData = req.body;
    delete updateData.uid; // Don't allow UID changes
    delete updateData.email; // Email changes should go through Firebase Auth
    delete updateData.role; // Role changes should use admin endpoint

    updateData.updatedAt = new Date();

    await firestore.collection(USERS_COLLECTION).doc(decodedToken.uid).update(updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
