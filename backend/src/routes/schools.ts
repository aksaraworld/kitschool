import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firebaseAuth, firestore, setUserRole } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { getSubscriptionFeePerStudent } from '../utils/config';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

// Get all schools (SaaS Admin only)
router.get('/', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const { status, isActive } = req.query;
    let ref: FirebaseFirestore.Query = firestore.collection('schools');
    if (status) ref = ref.where('subscriptionStatus', '==', String(status));
    if (isActive !== undefined) ref = ref.where('isActive', '==', isActive === 'true');

    const snap = await ref.get();
    const rows = snap.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const createdByIds = rows.map((r) => r.createdBy).filter(Boolean).map(String);
    const usersMap = await getDocsByIds(USERS_COLLECTION, createdByIds);

    res.json(
      rows.map((r) => ({
        ...r,
        createdBy: r.createdBy ? usersMap.get(String(r.createdBy)) || r.createdBy : r.createdBy,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get school by ID (SaaS Admin or school users)
router.get('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = req.params.id;

    if (req.user?.role !== UserRole.SAAS_ADMIN && req.schoolId !== schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const snap = await firestore.collection('schools').doc(schoolId).get();
    if (!snap.exists) return res.status(404).json({ message: 'School not found' });
    res.json(docToJson(snap));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create school (SaaS Admin only)
router.post('/', authenticate, authorize(UserRole.SAAS_ADMIN), async (req: SchoolContextRequest, res) => {
  try {
    // Get default subscription fee per student from config
    const defaultSubscriptionFee = await getSubscriptionFeePerStudent();
    const body = req.body || {};

    const schoolRef = firestore.collection('schools').doc();
    await schoolRef.set({
      ...body,
      createdBy: req.user?.uid,
      subscriptionStatus: body.subscriptionStatus || 'trial',
      subscriptionFeePerStudent:
        body.subscriptionFeePerStudent !== undefined ? body.subscriptionFeePerStudent : defaultSubscriptionFee,
      isActive: body.isActive ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Optional: create principal user in Firebase Auth + Firestore
    if (body.principalEmail && body.principalPassword) {
      const userRecord = await firebaseAuth.createUser({
        email: body.principalEmail,
        password: body.principalPassword,
        displayName: body.principalName || 'Principal',
        disabled: false,
      });
      await setUserRole(userRecord.uid, UserRole.PRINCIPAL, schoolRef.id);
      await firestore.collection(USERS_COLLECTION).doc(userRecord.uid).set(
        {
          email: body.principalEmail,
          name: body.principalName || 'Principal',
          role: UserRole.PRINCIPAL,
          schoolId: schoolRef.id,
          phone: body.principalPhone || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    res.status(201).json(docToJson(await schoolRef.get()));
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update school (SaaS Admin can update any, Principal/Staff can update their own)
router.put('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = req.params.id;
    const docRef = firestore.collection('schools').doc(schoolId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'School not found' });
    }

    // SaaS Admin can update any school
    if (req.user?.role === UserRole.SAAS_ADMIN) {
      await docRef.set({ ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return res.json(docToJson(await docRef.get()));
    }

    // Principal/Staff can only update their own school profile (not subscription)
    if (req.schoolId !== schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Remove subscription fields if not SaaS Admin
    const updateData = { ...req.body };
    delete updateData.subscriptionStatus;
    delete updateData.subscriptionStartDate;
    delete updateData.subscriptionEndDate;
    delete updateData.subscriptionFeePerStudent; // Only SaaS Admin can update this
    delete updateData.settlementAccount;
    delete updateData.createdBy;

    await docRef.set({ ...updateData, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update subscription (SaaS Admin only)
router.put('/:id/subscription', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionEndDate, subscriptionFeePerStudent } = req.body;
    const docRef = firestore.collection('schools').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ message: 'School not found' });

    await docRef.set(
      {
        subscriptionStatus,
        subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
        subscriptionFeePerStudent: subscriptionFeePerStudent !== undefined ? subscriptionFeePerStudent : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

