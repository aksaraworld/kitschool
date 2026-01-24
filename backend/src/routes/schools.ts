import express from 'express';
import School, { SubscriptionStatus } from '../models/School';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest } from '../middleware/schoolContext';
import { UserRole } from '../models/User';
import { getSubscriptionFeePerStudent } from '../utils/config';

const router = express.Router();

// Get all schools (SaaS Admin only)
router.get('/', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const { status, isActive } = req.query;
    const query: any = {};

    if (status) {
      query.subscriptionStatus = status;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const schools = await School.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get school by ID (SaaS Admin or school users)
router.get('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = req.params.id;

    // SaaS Admin can access any school
    if (req.user?.role === UserRole.SAAS_ADMIN) {
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      return res.json(school);
    }

    // Other users can only access their own school
    if (req.schoolId !== schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create school (SaaS Admin only)
router.post('/', authenticate, authorize(UserRole.SAAS_ADMIN), async (req: AuthRequest, res) => {
  try {
    // Get default subscription fee per student from config
    const defaultSubscriptionFee = await getSubscriptionFeePerStudent();

    const schoolData = {
      ...req.body,
      createdBy: req.user?.id,
      subscriptionStatus: req.body.subscriptionStatus || SubscriptionStatus.TRIAL,
      subscriptionFeePerStudent: req.body.subscriptionFeePerStudent !== undefined 
        ? req.body.subscriptionFeePerStudent 
        : defaultSubscriptionFee
    };

    const school = new School(schoolData);
    await school.save();

    // Create principal user if provided
    if (req.body.principalEmail && req.body.principalPassword) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(req.body.principalPassword, 10);
      
      const principal = new User({
        email: req.body.principalEmail,
        password: hashedPassword,
        name: req.body.principalName || 'Principal',
        role: UserRole.PRINCIPAL,
        schoolId: school._id,
        employeeId: `PRIN-${school._id.toString().slice(0, 6)}`,
        isActive: true
      });
      await principal.save();
    }

    const populated = await School.findById(school._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'School email already exists' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update school (SaaS Admin can update any, Principal/Staff can update their own)
router.put('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = req.params.id;

    // SaaS Admin can update any school
    if (req.user?.role === UserRole.SAAS_ADMIN) {
      const school = await School.findByIdAndUpdate(
        schoolId,
        req.body,
        { new: true, runValidators: true }
      );
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      return res.json(school);
    }

    // Principal/Staff can only update their own school profile (not subscription)
    if (req.schoolId !== schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Remove subscription fields if not SaaS Admin
    const updateData = { ...req.body };
    delete updateData.subscriptionStatus;
    delete updateData.subscriptionStartDate;
    delete updateData.subscriptionEndDate;
    delete updateData.subscriptionFeePerStudent; // Only SaaS Admin can update this
    delete updateData.settlementAccount;
    delete updateData.createdBy;

    const school = await School.findByIdAndUpdate(
      schoolId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update subscription (SaaS Admin only)
router.put('/:id/subscription', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionEndDate, subscriptionFeePerStudent } = req.body;
    
    const school = await School.findByIdAndUpdate(
      req.params.id,
      {
        subscriptionStatus,
        subscriptionEndDate,
        subscriptionFeePerStudent: subscriptionFeePerStudent !== undefined ? subscriptionFeePerStudent : null
      },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

