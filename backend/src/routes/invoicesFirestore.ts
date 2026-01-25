import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  return `INV-${year}-${Date.now()}`;
}

// Get invoices
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { studentId, parentId, status, month, year } = req.query;
    const q: any = getSchoolQuery(req);

    // Parents can only see their own invoices
    if (req.user?.role === UserRole.PARENT) {
      q.parentId = req.user.uid;
    } else if (parentId) {
      q.parentId = String(parentId);
    }

    if (studentId) q.studentId = String(studentId);
    if (status) q.status = String(status);
    if (month) q.month = Number(month);
    if (year) q.year = Number(year);

    let ref: FirebaseFirestore.Query = firestore.collection('invoices');
    if (q.schoolId) ref = ref.where('schoolId', '==', q.schoolId);
    if (q.parentId) ref = ref.where('parentId', '==', q.parentId);
    if (q.studentId) ref = ref.where('studentId', '==', q.studentId);
    if (q.status) ref = ref.where('status', '==', q.status);
    if (q.month) ref = ref.where('month', '==', q.month);
    if (q.year) ref = ref.where('year', '==', q.year);

    const snap = await ref.get();
    const rows = snap.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));

    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.studentId, r.parentId, r.createdBy]).filter(Boolean).map(String))
    );
    const usersMap = await getDocsByIds(USERS_COLLECTION, userIds);

    res.json(
      rows.map((r) => ({
        ...r,
        studentId: usersMap.get(String(r.studentId)) || r.studentId,
        parentId: usersMap.get(String(r.parentId)) || r.parentId,
        createdBy: r.createdBy ? usersMap.get(String(r.createdBy)) || r.createdBy : r.createdBy,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get invoice by ID (+ payment attempts)
router.get('/:id', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('invoices').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = docToJson(snap);

    if (String(invoice.schoolId) !== String(req.schoolId)) return res.status(403).json({ message: 'Forbidden' });
    if (req.user?.role === UserRole.PARENT && String(invoice.parentId) !== String(req.user.uid)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const paSnap = await firestore
      .collection('paymentAttempts')
      .where('schoolId', '==', req.schoolId)
      .where('invoiceId', '==', req.params.id)
      .get();
    const paymentAttempts = paSnap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d));
    paymentAttempts.sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    res.json({ invoice, paymentAttempts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create invoice (Finance, Staff, Principal only)
router.post(
  '/',
  authenticate,
  setSchoolContext,
  requireSchoolContext,
  authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL),
  async (req: SchoolContextRequest, res) => {
    try {
      const body = req.body || {};
      const amount = Number(body.amount || 0);
      const invoiceRef = firestore.collection('invoices').doc();

      await invoiceRef.set({
        ...body,
        schoolId: req.schoolId,
        invoiceNumber: body.invoiceNumber || generateInvoiceNumber(),
        amount,
        paidAmount: 0,
        remainingAmount: amount,
        createdBy: req.user?.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json(docToJson(await invoiceRef.get()));
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Update invoice
router.put(
  '/:id',
  authenticate,
  setSchoolContext,
  requireSchoolContext,
  authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL),
  async (req: SchoolContextRequest, res) => {
    try {
      const docRef = firestore.collection('invoices').doc(req.params.id);
      const snap = await docRef.get();
      if (!snap.exists) return res.status(404).json({ message: 'Invoice not found' });
      const invoice = docToJson(snap);
      if (String(invoice.schoolId) !== String(req.schoolId)) return res.status(403).json({ message: 'Forbidden' });

      await docRef.set({ ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      res.json(docToJson(await docRef.get()));
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

// Create payment attempt for invoice
router.post(
  '/:id/payment-attempts',
  authenticate,
  setSchoolContext,
  requireSchoolContext,
  async (req: SchoolContextRequest, res) => {
    try {
      const invoiceId = req.params.id;
      const invRef = firestore.collection('invoices').doc(invoiceId);
      const invSnap = await invRef.get();
      if (!invSnap.exists) return res.status(404).json({ message: 'Invoice not found' });
      const invoice = docToJson(invSnap);
      if (String(invoice.schoolId) !== String(req.schoolId)) return res.status(403).json({ message: 'Forbidden' });

      const body = req.body || {};
      const attemptRef = firestore.collection('paymentAttempts').doc();
      await attemptRef.set({
        ...body,
        schoolId: req.schoolId,
        invoiceId,
        studentId: body.studentId || invoice.studentId,
        parentId: body.parentId || invoice.parentId,
        amount: Number(body.amount || invoice.remainingAmount || invoice.amount || 0),
        status: body.status || 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.status(201).json(docToJson(await attemptRef.get()));
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  }
);

export default router;

