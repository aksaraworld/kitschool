import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { docToJson } from '../utils/firestoreUtils';

const router = express.Router();

// Get transaction fees (school-scoped)
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q: any = getSchoolQuery(req);
    let ref: FirebaseFirestore.Query = firestore.collection('transactionFees');
    if (q.schoolId) ref = ref.where('schoolId', '==', q.schoolId);
    const snap = await ref.get();
    res.json(snap.docs.map((d) => docToJson(d)));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get transaction fee by invoice
router.get('/invoice/:invoiceId', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const snap = await firestore
      .collection('transactionFees')
      .where('schoolId', '==', req.schoolId)
      .where('invoiceId', '==', req.params.invoiceId)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ message: 'Transaction fee not found' });
    res.json(docToJson(snap.docs[0]));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Statistics (SaaS Admin only)
router.get('/statistics', authenticate, authorize(UserRole.SAAS_ADMIN), async (_req, res) => {
  try {
    const snap = await firestore.collection('transactionFees').get();
    const rows = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d));
    const total = rows.reduce((sum: number, r: any) => sum + Number(r.adminFeeAmount || 0), 0);
    res.json({ totalAdminFees: total, count: rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Settle a fee (SaaS Admin only)
router.put('/:id/settle', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const docRef = firestore.collection('transactionFees').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ message: 'Transaction fee not found' });

    await docRef.set(
      { status: 'settled', settledAt: new Date(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

