import express from 'express';
import Attendance, { AttendanceType, AttendanceStatus } from '../models/Attendance';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../models/User';

const router = express.Router();

// Get attendance records
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { userId, date, type, classId } = req.query;
    const query: any = getSchoolQuery(req);

    // Students can only see their own attendance
    if (req.user?.role === UserRole.STUDENT) {
      query.userId = req.user.id;
    } else if (userId) {
      query.userId = userId;
    }

    if (date) {
      const dateObj = new Date(date as string);
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (type) {
      query.type = type;
    }

    if (classId) {
      query.classId = classId;
    }

    const attendance = await Attendance.find(query)
      .populate('userId', 'name email studentId')
      .populate('classId', 'name')
      .sort({ date: -1 });

    res.json(attendance);
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
      if (userId !== req.user.id) {
        return res.status(403).json({ message: 'You can only submit your own attendance' });
      }
    }

    const attendance = new Attendance({
      schoolId: req.schoolId,
      userId: userId || req.user?.id,
      type: type || AttendanceType.STUDENT,
      date: date || new Date(),
      status,
      checkInTime: checkInTime || new Date(),
      notes,
      classId
    });

    await attendance.save();
    const populated = await Attendance.findById(attendance._id)
      .populate('userId', 'name email studentId')
      .populate('classId', 'name');

    res.status(201).json(populated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already recorded for this date' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update attendance
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }

    // Check school access
    if (attendance.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Students can only update their own attendance if status is still pending
    if (req.user?.role === UserRole.STUDENT) {
      if (attendance.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    Object.assign(attendance, req.body);
    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate('userId', 'name email studentId')
      .populate('classId', 'name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

