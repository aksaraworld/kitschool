import express from 'express';
import Payment, { PaymentStatus } from '../models/Payment';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../models/User';

const router = express.Router();

// Get payments
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { studentId, parentId, status, month, year } = req.query;
    const query: any = getSchoolQuery(req);

    // Parents can only see their own payments
    if (req.user?.role === UserRole.PARENT) {
      query.parentId = req.user.id;
    } else if (parentId) {
      query.parentId = parentId;
    }

    // Finance and Staff can see all
    if (studentId) {
      query.studentId = studentId;
    }

    if (status) {
      query.status = status;
    }

    if (month) {
      query.month = parseInt(month as string);
    }

    if (year) {
      query.year = parseInt(year as string);
    }

    const payments = await Payment.find(query)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .sort({ dueDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create payment (Finance, Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const payment = new Payment({
      ...req.body,
      schoolId: req.schoolId
    });
    await payment.save();
    const populated = await Payment.findById(payment._id)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email');
    res.status(201).json(populated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Payment already exists for this student, month, and year' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update payment status (Parents can mark as paid, Finance can update all)
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check school access
    if (payment.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Parents can only update their own payments to paid
    if (req.user?.role === UserRole.PARENT) {
      if (payment.parentId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (req.body.status && req.body.status !== PaymentStatus.PAID) {
        return res.status(403).json({ message: 'You can only mark payments as paid' });
      }
      req.body.paidDate = new Date();
    }

    Object.assign(payment, req.body);
    await payment.save();

    const populated = await Payment.findById(payment._id)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

