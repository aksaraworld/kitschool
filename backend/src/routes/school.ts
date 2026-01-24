import express from 'express';
import School from '../models/School';
import { authenticate, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext } from '../middleware/schoolContext';
import { UserRole } from '../models/User';

const router = express.Router();

// Get current user's school profile
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const school = await School.findById(req.schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School profile not found' });
    }
    res.json(school);
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

    const school = await School.findByIdAndUpdate(
      req.schoolId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ message: 'School profile not found' });
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

