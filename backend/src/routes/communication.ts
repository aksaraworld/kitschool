import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { authenticate } from '../middleware/firebaseAuth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { USERS_COLLECTION } from '../models/firestore/User';
import { docToJson, getDocsByIds } from '../utils/firestoreUtils';

const router = express.Router();

// Get communications (inbox)
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { type } = req.query; // 'sent' or 'received'
    const query: any = getSchoolQuery(req);

    const me = req.user?.uid;
    if (!me) return res.status(401).json({ message: 'Unauthorized' });

    if (type === 'sent') {
      query.from = me;
    } else {
      query.to = me;
    }

    let ref: FirebaseFirestore.Query = firestore.collection('communications');
    if (query.schoolId) ref = ref.where('schoolId', '==', query.schoolId);
    if (query.from) ref = ref.where('from', '==', String(query.from));
    if (query.to) ref = ref.where('to', '==', String(query.to));
    const snap = await ref.get();
    const rows = snap.docs.map((d) => docToJson(d));
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.from, r.to]).filter(Boolean).map(String))
    );
    const usersMap = await getDocsByIds(USERS_COLLECTION, userIds);

    res.json(
      rows.map((r) => ({
        ...r,
        from: usersMap.get(String(r.from)) || r.from,
        to: usersMap.get(String(r.to)) || r.to,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create communication
router.post('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const me = req.user?.uid;
    if (!me) return res.status(401).json({ message: 'Unauthorized' });

    const docRef = firestore.collection('communications').doc();
    await docRef.set({
      ...(req.body || {}),
      schoolId: req.schoolId,
      from: me,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Mark as read
router.put('/:id/read', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const docRef = firestore.collection('communications').doc(req.params.id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: 'Communication not found' });
    }
    const communication = docToJson(snap);

    // Check school access
    if (String(communication.schoolId) !== String(req.schoolId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (String(communication.to) !== String(req.user?.uid)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await docRef.set(
      { isRead: true, readAt: new Date(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    res.json(docToJson(await docRef.get()));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

