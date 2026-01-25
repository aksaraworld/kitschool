import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../types';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

// Get all classes
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q = getSchoolQuery(req);
    let ref: FirebaseFirestore.Query = firestore.collection('classes');
    if (q.schoolId) ref = ref.where('schoolId', '==', q.schoolId);
    const snap = await ref.get();
    const classes = snap.docs.map((d) => docToJson(d));

    // Best-effort "populate" for UI compatibility
    const yearIds = classes.map((c) => c.yearId).filter(Boolean);
    const majorIds = classes.map((c) => c.majorId).filter(Boolean);
    const teacherIds = classes.map((c) => c.homeroomTeacherId).filter(Boolean);
    const studentIds = classes.flatMap((c) => Array.isArray(c.studentIds) ? c.studentIds : []).filter(Boolean);

    const [yearsMap, majorsMap, usersMap] = await Promise.all([
      getDocsByIds('years', yearIds),
      getDocsByIds('majors', majorIds),
      getDocsByIds(USERS_COLLECTION, [...teacherIds, ...studentIds]),
    ]);

    const hydrated = classes.map((c) => ({
      ...c,
      yearId: yearsMap.get(String(c.yearId)) || c.yearId,
      majorId: majorsMap.get(String(c.majorId)) || c.majorId,
      homeroomTeacherId: usersMap.get(String(c.homeroomTeacherId)) || c.homeroomTeacherId,
      studentIds: Array.isArray(c.studentIds)
        ? c.studentIds.map((id: string) => usersMap.get(String(id)) || id)
        : [],
    }));

    res.json(hydrated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create class (Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const data = { ...(req.body || {}), schoolId: req.schoolId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };

    // Best-effort uniqueness check: (schoolId, name, yearId, majorId)
    const dupSnap = await firestore
      .collection('classes')
      .where('schoolId', '==', req.schoolId)
      .where('name', '==', data.name)
      .where('yearId', '==', data.yearId)
      .where('majorId', '==', data.majorId)
      .limit(1)
      .get();
    if (!dupSnap.empty) {
      return res.status(400).json({ message: 'Class already exists' });
    }

    const docRef = firestore.collection('classes').doc();
    await docRef.set(data);
    const created = await docRef.get();
    res.status(201).json(docToJson(created));
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get years
router.get('/years', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q = getSchoolQuery(req);
    let ref: FirebaseFirestore.Query = firestore.collection('years');
    if (q.schoolId) ref = ref.where('schoolId', '==', q.schoolId);
    const snap = await ref.get();
    const years = snap.docs.map((d) => docToJson(d));
    years.sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create year (Staff, Principal only)
router.post('/years', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const data = { ...(req.body || {}), schoolId: req.schoolId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    // Best-effort unique name per school
    const dup = await firestore.collection('years').where('schoolId', '==', req.schoolId).where('name', '==', data.name).limit(1).get();
    if (!dup.empty) return res.status(400).json({ message: 'Year name already exists' });

    const docRef = firestore.collection('years').doc();
    await docRef.set(data);
    res.status(201).json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get majors
router.get('/majors', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const q = getSchoolQuery(req);
    let ref: FirebaseFirestore.Query = firestore.collection('majors');
    if (q.schoolId) ref = ref.where('schoolId', '==', q.schoolId);
    ref = ref.where('isActive', '==', true);
    const snap = await ref.get();
    res.json(snap.docs.map((d) => docToJson(d)));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create major (Staff, Principal only)
router.post('/majors', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const body = req.body || {};
    const code = String(body.code || '').toUpperCase();
    const data = { ...body, code, schoolId: req.schoolId, isActive: body.isActive ?? true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };

    const dup = await firestore.collection('majors').where('schoolId', '==', req.schoolId).where('code', '==', code).limit(1).get();
    if (!dup.empty) return res.status(400).json({ message: 'Major code already exists' });

    const docRef = firestore.collection('majors').doc();
    await docRef.set(data);
    res.status(201).json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update major (Staff, Principal only)
router.put('/majors/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('majors').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Major not found' });
    }
    const major = docToJson(snap);
    if (String(major.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const next: any = { ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() };
    if (next.code) next.code = String(next.code).toUpperCase();
    await docRef.set(next, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete major (Staff, Principal only)
router.delete('/majors/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('majors').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Major not found' });
    }
    const major = docToJson(snap);
    if (String(major.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await docRef.delete();
    res.json({ message: 'Major deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update year (Staff, Principal only)
router.put('/years/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('years').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Year not found' });
    }
    const year = docToJson(snap);
    if (String(year.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await docRef.set({ ...(req.body || {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(docToJson(await docRef.get()));
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete year (Staff, Principal only)
router.delete('/years/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('years').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Year not found' });
    }
    const year = docToJson(snap);
    if (String(year.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await docRef.delete();
    res.json({ message: 'Year deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

