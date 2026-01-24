import express from 'express';
import Class from '../models/Class';
import Year from '../models/Year';
import Major from '../models/Major';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../models/User';

const router = express.Router();

// Get all classes
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const query: any = getSchoolQuery(req);
    const classes = await Class.find(query)
      .populate('yearId', 'name')
      .populate('majorId', 'name code')
      .populate('homeroomTeacherId', 'name email')
      .populate('studentIds', 'name studentId');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create class (Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const classData = new Class({
      ...req.body,
      schoolId: req.schoolId
    });
    await classData.save();
    const populated = await Class.findById(classData._id)
      .populate('yearId', 'name')
      .populate('majorId', 'name code')
      .populate('homeroomTeacherId', 'name email');
    res.status(201).json(populated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Class already exists' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get years
router.get('/years', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const query: any = getSchoolQuery(req);
    const years = await Year.find(query).sort({ startDate: -1 });
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create year (Staff, Principal only)
router.post('/years', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const year = new Year({
      ...req.body,
      schoolId: req.schoolId
    });
    await year.save();
    res.status(201).json(year);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get majors
router.get('/majors', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const query: any = { ...getSchoolQuery(req), isActive: true };
    const majors = await Major.find(query);
    res.json(majors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create major (Staff, Principal only)
router.post('/majors', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const major = new Major({
      ...req.body,
      schoolId: req.schoolId
    });
    await major.save();
    res.status(201).json(major);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update major (Staff, Principal only)
router.put('/majors/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const major = await Major.findById(req.params.id);
    if (!major) {
      return res.status(404).json({ message: 'Major not found' });
    }
    if (major.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await Major.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Major code already exists' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete major (Staff, Principal only)
router.delete('/majors/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const major = await Major.findById(req.params.id);
    if (!major) {
      return res.status(404).json({ message: 'Major not found' });
    }
    if (major.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Major.findByIdAndDelete(req.params.id);
    res.json({ message: 'Major deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update year (Staff, Principal only)
router.put('/years/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const year = await Year.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ message: 'Year not found' });
    }
    if (year.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await Year.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Year name already exists' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Delete year (Staff, Principal only)
router.delete('/years/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const year = await Year.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ message: 'Year not found' });
    }
    if (year.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await Year.findByIdAndDelete(req.params.id);
    res.json({ message: 'Year deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

