import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

// Get payments
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { studentId, parentId, status, month, year } = req.query;
    const query: any = getSchoolQuery(req);

    // Parents can only see their own payments
    if (req.user?.role === UserRole.PARENT) {
      query.parentId = req.user.uid;
    } else if (parentId) {
      query.parentId = parentId;
    }

    // Finance and Staff can see all
    if (studentId) {
      query.studentId = studentId;
    }

    if (status) {
      query.status = status;
    }

    if (month) query.month = parseInt(month as string, 10);
    if (year) query.year = parseInt(year as string, 10);

    let ref: FirebaseFirestore.Query = firestore.collection('payments');
    if (query.schoolId) ref = ref.where('schoolId', '==', query.schoolId);
    if (query.parentId) ref = ref.where('parentId', '==', String(query.parentId));
    if (query.studentId) ref = ref.where('studentId', '==', String(query.studentId));
    if (query.status) ref = ref.where('status', '==', String(query.status));
    if (query.month) ref = ref.where('month', '==', Number(query.month));
    if (query.year) ref = ref.where('year', '==', Number(query.year));

    const snap = await ref.get();
    const rows = snap.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));

    const studentIds = rows.map((r) => r.studentId).filter(Boolean);
    const parentIds = rows.map((r) => r.parentId).filter(Boolean);
    const usersMap = await getDocsByIds(USERS_COLLECTION, [...studentIds, ...parentIds]);

    res.json(
      rows.map((r) => ({
        ...r,
        studentId: usersMap.get(String(r.studentId)) || r.studentId,
        parentId: usersMap.get(String(r.parentId)) || r.parentId,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create payment (Finance, Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const body = req.body || {};
    const student = String(body.studentId);
    const m = Number(body.month);
    const y = Number(body.year);
    const id = `${req.schoolId}_${student}_${m}_${y}`;

    const docRef = firestore.collection('payments').doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      return res.status(400).json({ message: 'Payment already exists for this student, month, and year' });
    }

    await docRef.set({
      ...body,
      schoolId: req.schoolId,
      month: m,
      year: y,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.status(201).json(docToJson(await docRef.get()));
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update payment status (Parents can mark as paid, Finance can update all)
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('payments').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    const payment = docToJson(snap);

    // Check school access
    if (String(payment.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Parents can only update their own payments to paid
    if (req.user?.role === UserRole.PARENT) {
      if (String(payment.parentId) !== String(req.user.uid)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (req.body.status && String(req.body.status) !== 'paid') {
        return res.status(403).json({ message: 'You can only mark payments as paid' });
      }
      req.body.paidDate = new Date();
    }

    await docRef.set({ ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

