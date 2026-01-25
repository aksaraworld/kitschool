import express from 'express';
import { firestore } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

// Attendance report
router.get('/attendance', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q: any = getSchoolQuery(req);
    let ref: FirebaseFirestore.Query = firestore.collection('attendance').where('schoolId', '==', q.schoolId);
    const snap = await ref.get();
    const rows = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Payments report
router.get('/payments', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q: any = getSchoolQuery(req);
    const snap = await firestore.collection('paymentAttempts').where('schoolId', '==', q.schoolId).get();
    res.json(snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d)));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Students report
router.get('/students', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q: any = getSchoolQuery(req);
    const snap = await firestore
      .collection(USERS_COLLECTION)
      .where('schoolId', '==', q.schoolId)
      .where('role', '==', UserRole.STUDENT)
      .get();
    res.json(snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d)));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Academic report (studentActivities)
router.get('/academic', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q: any = getSchoolQuery(req);
    const snap = await firestore.collection('studentActivities').where('schoolId', '==', q.schoolId).get();
    res.json(snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d)));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Dashboard summary
router.get(
  '/dashboard',
  authenticate,
  setSchoolContext,
  requireSchoolContext,
  authorize(UserRole.PRINCIPAL, UserRole.STAFF, UserRole.FINANCE),
  async (req: SchoolContextRequest, res) => {
    try {
      const schoolId = req.schoolId!;

      const [studentsSnap, invoicesSnap, paymentsSnap] = await Promise.all([
        firestore.collection(USERS_COLLECTION).where('schoolId', '==', schoolId).where('role', '==', UserRole.STUDENT).get(),
        firestore.collection('invoices').where('schoolId', '==', schoolId).get(),
        firestore.collection('paymentAttempts').where('schoolId', '==', schoolId).get(),
      ]);

      const totalInvoiceAmount = invoicesSnap.docs.reduce((sum: number, d: FirebaseFirestore.QueryDocumentSnapshot) => sum + Number(d.data().amount || 0), 0);
      const totalPaidAmount = invoicesSnap.docs.reduce((sum: number, d: FirebaseFirestore.QueryDocumentSnapshot) => sum + Number(d.data().paidAmount || 0), 0);

      res.json({
        schoolId,
        students: studentsSnap.size,
        invoices: invoicesSnap.size,
        paymentAttempts: paymentsSnap.size,
        totalInvoiceAmount,
        totalPaidAmount,
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

export default router;

