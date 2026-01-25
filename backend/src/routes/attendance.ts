import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Get attendance records
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { userId, date, type, classId } = req.query;
    const query: any = getSchoolQuery(req);

    // Students can only see their own attendance
    if (req.user?.role === UserRole.STUDENT) {
      query.userId = req.user.uid;
    } else if (userId) {
      query.userId = userId;
    }

    let ref: FirebaseFirestore.Query = firestore.collection('attendance');
    if (query.schoolId) ref = ref.where('schoolId', '==', query.schoolId);
    if (query.userId) ref = ref.where('userId', '==', String(query.userId));
    if (type) ref = ref.where('type', '==', String(type));
    if (classId) ref = ref.where('classId', '==', String(classId));

    if (date) {
      const dateObj = new Date(String(date));
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      ref = ref.where('date', '>=', startOfDay).where('date', '<=', endOfDay);
    }

    const snap = await ref.get();
    const rows = snap.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    const userIds = rows.map((r) => r.userId).filter(Boolean);
    const classIds = rows.map((r) => r.classId).filter(Boolean);
    const [usersMap, classesMap] = await Promise.all([
      getDocsByIds(USERS_COLLECTION, userIds),
      getDocsByIds('classes', classIds),
    ]);

    const hydrated = rows.map((r) => ({
      ...r,
      userId: usersMap.get(String(r.userId)) || r.userId,
      classId: r.classId ? (classesMap.get(String(r.classId)) || r.classId) : r.classId,
    }));

    res.json(hydrated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create attendance (Student for self, Teacher/Staff for others)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { userId, type, date, status, checkInTime, notes, classId } = req.body;

    // Students can only create their own attendance
    if (req.user?.role === UserRole.STUDENT) {
      if (userId && String(userId) !== req.user.uid) {
        return res.status(403).json({ message: 'You can only submit your own attendance' });
      }
    }

    const finalUserId = String(userId || req.user?.uid);
    const finalDate = date ? new Date(date) : new Date();
    const id = `${req.schoolId}_${finalUserId}_${dayKey(finalDate)}`;

    const docRef = firestore.collection('attendance').doc(id);
    const exists = await docRef.get();
    if (exists.exists) {
      return res.status(400).json({ message: 'Attendance already recorded for this date' });
    }

    await docRef.set({
      schoolId: req.schoolId,
      userId: finalUserId,
      type: type || 'student',
      date: finalDate,
      status,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      notes,
      classId: classId || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json(docToJson(await docRef.get()));
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update attendance
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('attendance').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Attendance not found' });
    }
    const attendance = docToJson(snap);

    // Check school access
    if (String(attendance.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Students can only update their own attendance if status is still pending
    if (req.user?.role === UserRole.STUDENT) {
      if (String(attendance.userId) !== String(req.user.uid)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    await docRef.set({ ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

