import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

// Get schedules
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { classId, startDate, endDate, type } = req.query;
    const query: any = getSchoolQuery(req);

    let ref: FirebaseFirestore.Query = firestore.collection('schedules');
    if (query.schoolId) ref = ref.where('schoolId', '==', query.schoolId);
    if (classId) ref = ref.where('classId', '==', String(classId));
    if (type) ref = ref.where('type', '==', String(type));
    if (startDate && endDate) {
      ref = ref.where('startDate', '>=', new Date(String(startDate))).where('startDate', '<=', new Date(String(endDate)));
    }

    const snap = await ref.get();
    const rows = snap.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(a.startDate || '').localeCompare(String(b.startDate || '')));

    const classIds = rows.map((r) => r.classId).filter(Boolean);
    const createdByIds = rows.map((r) => r.createdBy).filter(Boolean);
    const [classesMap, usersMap] = await Promise.all([
      getDocsByIds('classes', classIds),
      getDocsByIds(USERS_COLLECTION, createdByIds),
    ]);

    res.json(
      rows.map((r) => ({
        ...r,
        classId: r.classId ? (classesMap.get(String(r.classId)) || r.classId) : r.classId,
        createdBy: r.createdBy ? (usersMap.get(String(r.createdBy)) || r.createdBy) : r.createdBy,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create schedule (Teachers, Homeroom, Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('schedules').doc();
    await docRef.set({
      ...(req.body || {}),
      schoolId: req.schoolId,
      createdBy: req.user?.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.status(201).json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update schedule
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('schedules').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    const schedule = docToJson(snap);

    // Check school access
    if (String(schedule.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await docRef.set({ ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete schedule
router.delete('/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('schedules').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    const schedule = docToJson(snap);

    // Check school access
    if (String(schedule.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await docRef.delete();
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

