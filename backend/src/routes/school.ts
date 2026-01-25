import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { docToJson } from '../utils/firestoreUtils';

const router = express.Router();

// Get current user's school profile
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('schools').doc(String(req.schoolId));
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'School profile not found' });
    }
    res.json(docToJson(snap));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update current user's school profile (Principal, Staff only - cannot update subscription)
router.put('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    // Only Principal and Staff can update
    if (req.user?.role !== UserRole.PRINCIPAL && req.user?.role !== UserRole.STAFF) {
      return res.status(403).json({ message: 'Only Principal and Staff can update school profile' });
    }

    // Remove subscription fields (only SaaS Admin can update these)
    const updateData = { ...req.body };
    delete updateData.subscriptionStatus;
    delete updateData.subscriptionStartDate;
    delete updateData.subscriptionEndDate;
    delete updateData.subscriptionFeePerStudent;
    delete updateData.settlementAccount;
    delete updateData.createdBy;
    delete updateData.isActive;

    const docRef = firestore.collection('schools').doc(String(req.schoolId));
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'School profile not found' });
    }

    await docRef.set({ ...updateData, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

