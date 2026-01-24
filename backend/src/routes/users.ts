import express from 'express';
import bcrypt from 'bcryptjs';
import User, { UserRole } from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';

const router = express.Router();

// Get all users (SaaS Admin can see all, Staff/Principal see their school only)
router.get('/', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const query: any = getSchoolQuery(req);
    const { role } = req.query;
    
    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create user (SaaS Admin, Staff, Principal only)
router.post('/', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    // SaaS Admin can create users for any school
    // Staff/Principal can only create users for their school
    if (req.user?.role !== UserRole.SAAS_ADMIN && req.user?.role !== UserRole.STAFF && req.user?.role !== UserRole.PRINCIPAL) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const {
      email,
      password,
      name,
      role,
      phone,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      children,
      department,
      schoolId // For SaaS Admin to specify school
    } = req.body;

    // Determine schoolId
    let targetSchoolId = schoolId;
    if (req.user?.role !== UserRole.SAAS_ADMIN) {
      // Staff/Principal must use their own school
      targetSchoolId = req.schoolId;
    }

    // SAAS_ADMIN doesn't need schoolId
    if (role === UserRole.SAAS_ADMIN) {
      targetSchoolId = undefined;
    } else if (!targetSchoolId) {
      return res.status(400).json({ message: 'schoolId is required for non-SaaS Admin users' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      role,
      schoolId: targetSchoolId,
      phone,
      studentId,
      teacherId,
      employeeId,
      classId,
      year,
      major,
      children,
      department
    });

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email, studentId, teacherId, or employeeId already exists' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get user by ID
router.get('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // SaaS Admin can see any user
    if (req.user?.role === UserRole.SAAS_ADMIN) {
      return res.json(user);
    }

    // Students can only see their own profile
    if (req.user?.role === UserRole.STUDENT && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Parents can see their children's profiles (same school)
    if (req.user?.role === UserRole.PARENT) {
      if (req.user.id !== req.params.id && user.role !== UserRole.STUDENT) {
        // Check if user is a child
        const parentUser = await User.findById(req.user.id);
        if (!parentUser?.children?.includes(user._id)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      // Must be same school
      if (user.schoolId?.toString() !== req.schoolId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.json(user);
    }

    // Staff/Principal can see users in their school
    if (user.schoolId?.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update user
router.put('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // SaaS Admin can update any user
    // Staff/Principal can only update users in their school
    if (req.user?.role !== UserRole.SAAS_ADMIN) {
      if (user.schoolId?.toString() !== req.schoolId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (req.user?.role !== UserRole.STAFF && req.user?.role !== UserRole.PRINCIPAL) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const updateData = { ...req.body };
    
    // Non-SaaS Admin cannot change schoolId or role to SAAS_ADMIN
    if (req.user?.role !== UserRole.SAAS_ADMIN) {
      delete updateData.schoolId;
      if (updateData.role === UserRole.SAAS_ADMIN) {
        return res.status(403).json({ message: 'Cannot assign SAAS_ADMIN role' });
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete user (soft delete) - SaaS Admin or Principal
router.delete('/:id', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // SaaS Admin can delete any user
    // Principal can only delete users in their school
    if (req.user?.role !== UserRole.SAAS_ADMIN) {
      if (req.user?.role !== UserRole.PRINCIPAL) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (user.schoolId?.toString() !== req.schoolId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

