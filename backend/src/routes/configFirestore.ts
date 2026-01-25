import express from 'express';
import { firestore } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticate, authorize } from '../middleware/firebaseAuth';
import { UserRole } from '../types';
import { CONFIG_KEYS, DEFAULT_CONFIG, getAdminFeePercentage, initializeDefaultConfig } from '../utils/config';
import { docToJson } from '../utils/firestoreUtils';

const router = express.Router();

// Initialize default config (SaaS Admin only)
router.post('/initialize', authenticate, authorize(UserRole.SAAS_ADMIN), async (_req, res) => {
  try {
    await initializeDefaultConfig();
    res.json({ message: 'Configuration initialized' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get all config (SaaS Admin only)
router.get('/', authenticate, authorize(UserRole.SAAS_ADMIN), async (_req, res) => {
  try {
    const snap = await firestore.collection('config').get();
    const rows = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => docToJson(d));
    rows.sort((a: any, b: any) => String(a.key).localeCompare(String(b.key)));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get config by key (SaaS Admin only)
router.get('/:key', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const snap = await firestore.collection('config').doc(req.params.key).get();
    if (!snap.exists) return res.status(404).json({ message: 'Config not found' });
    res.json(docToJson(snap));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update config by key (SaaS Admin only)
router.put('/:key', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const key = req.params.key;
    const value = req.body?.value;
    await firestore.collection('config').doc(key).set(
      {
        key,
        value,
        type:
          typeof value === 'number'
            ? 'number'
            : typeof value === 'boolean'
              ? 'boolean'
              : typeof value === 'object'
                ? 'object'
                : 'string',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    const snap = await firestore.collection('config').doc(key).get();
    res.json(docToJson(snap));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Public: admin fee
router.get('/public/admin-fee', async (_req, res) => {
  try {
    const adminFee = await getAdminFeePercentage();
    res.json({ adminFeePercentage: adminFee });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

