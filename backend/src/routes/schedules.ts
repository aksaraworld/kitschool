import express from 'express';
import Schedule from '../models/Schedule';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../models/User';

const router = express.Router();

// Get schedules
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { classId, startDate, endDate, type } = req.query;
    const query: any = getSchoolQuery(req);

    if (classId) {
      query.classId = classId;
    }

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    if (type) {
      query.type = type;
    }

    const schedules = await Schedule.find(query)
      .populate('classId', 'name')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create schedule (Teachers, Homeroom, Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const schedule = new Schedule({
      ...req.body,
      schoolId: req.schoolId,
      createdBy: req.user?.id
    });
    await schedule.save();
    const populated = await Schedule.findById(schedule._id)
      .populate('classId', 'name')
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update schedule
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Check school access
    if (schedule.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('classId', 'name')
      .populate('createdBy', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete schedule
router.delete('/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Check school access
    if (schedule.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

