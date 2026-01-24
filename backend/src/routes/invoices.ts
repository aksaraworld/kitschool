import express from 'express';
import Invoice, { InvoiceStatus } from '../models/Invoice';
import PaymentAttempt from '../models/PaymentAttempt';
import TransactionFee from '../models/TransactionFee';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../models/User';
import { calculateAdminFee } from '../utils/config';

const router = express.Router();

// Get invoices
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { studentId, parentId, status, month, year } = req.query;
    const query: any = getSchoolQuery(req);

    // Parents can only see their own invoices
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

    const invoices = await Invoice.find(query)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get invoice by ID
router.get('/:id', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check school access
    if (invoice.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Check access
    if (req.user?.role === UserRole.PARENT && invoice.parentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Get payment attempts for this invoice
    const paymentAttempts = await PaymentAttempt.find({ 
      invoiceId: invoice._id,
      schoolId: req.schoolId
    })
      .sort({ createdAt: -1 });

    res.json({ invoice, paymentAttempts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create invoice (Finance, Staff, Principal only)
router.post('/', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const invoice = new Invoice({
      ...req.body,
      schoolId: req.schoolId,
      createdBy: req.user?.id,
      paidAmount: 0,
      remainingAmount: req.body.amount
    });
    await invoice.save();
    const populated = await Invoice.findById(invoice._id)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Invoice number already exists' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update invoice
router.put('/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check school access
    if (invoice.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .populate('createdBy', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create payment attempt (Parents can create payment attempts)
router.post('/:id/payment-attempts', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check school access
    if (invoice.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Check access
    if (req.user?.role === UserRole.PARENT && invoice.parentId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const paymentAttempt = new PaymentAttempt({
      ...req.body,
      schoolId: req.schoolId,
      invoiceId: invoice._id,
      studentId: invoice.studentId,
      parentId: invoice.parentId,
      status: 'pending'
    });

    await paymentAttempt.save();
    const populated = await PaymentAttempt.findById(paymentAttempt._id)
      .populate('invoiceId')
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Update payment attempt status (Finance, Staff, Principal can process payments)
router.put('/payment-attempts/:id', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const paymentAttempt = await PaymentAttempt.findById(req.params.id)
      .populate('invoiceId');
    
    if (!paymentAttempt) {
      return res.status(404).json({ message: 'Payment attempt not found' });
    }

    // Check school access
    if (paymentAttempt.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { status, receiptUrl, proofOfPayment, notes } = req.body;

    // Update payment attempt
    paymentAttempt.status = status;
    if (receiptUrl) paymentAttempt.receiptUrl = receiptUrl;
    if (proofOfPayment) paymentAttempt.proofOfPayment = proofOfPayment;
    if (notes) paymentAttempt.notes = notes;

    if (status === 'success') {
      paymentAttempt.processedAt = new Date();
      
      // Update invoice
      const invoice = paymentAttempt.invoiceId as any;
      invoice.paidAmount = (invoice.paidAmount || 0) + paymentAttempt.amount;
      invoice.remainingAmount = invoice.amount - invoice.paidAmount;
      
      if (invoice.remainingAmount <= 0) {
        invoice.status = InvoiceStatus.PAID;
      } else if (invoice.paidAmount > 0) {
        invoice.status = InvoiceStatus.PARTIAL;
      }
      
      await invoice.save();

      // Calculate and store admin fee for this transaction
      try {
        // Calculate fee based on cumulative paid amount (for partial payments)
        const cumulativePaidAmount = invoice.paidAmount;
        const feeCalculation = await calculateAdminFee(cumulativePaidAmount);
        
        // Check if transaction fee already exists (for partial payments)
        const existingFee = await TransactionFee.findOne({ invoiceId: invoice._id });
        
        if (!existingFee) {
          // Create new transaction fee record
          const transactionFee = new TransactionFee({
            schoolId: req.schoolId!,
            invoiceId: invoice._id,
            transactionAmount: cumulativePaidAmount,
            adminFee: feeCalculation.adminFeePercentage,
            adminFeeAmount: feeCalculation.adminFeeAmount,
            feeBreakdown: feeCalculation.feeBreakdown,
            netAmount: feeCalculation.netAmount,
            status: 'calculated'
          });
          await transactionFee.save();
        } else {
          // Update existing transaction fee with cumulative amount
          existingFee.transactionAmount = cumulativePaidAmount;
          existingFee.adminFeeAmount = feeCalculation.adminFeeAmount;
          existingFee.feeBreakdown = feeCalculation.feeBreakdown;
          existingFee.netAmount = feeCalculation.netAmount;
          await existingFee.save();
        }
      } catch (error) {
        console.error('Error calculating admin fee:', error);
        // Don't fail the payment if fee calculation fails
      }
    }

    await paymentAttempt.save();

    const populated = await PaymentAttempt.findById(paymentAttempt._id)
      .populate('invoiceId')
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get payment attempts
router.get('/payment-attempts/all', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.FINANCE, UserRole.STAFF, UserRole.PRINCIPAL), async (req: SchoolContextRequest, res) => {
  try {
    const { status, studentId, parentId } = req.query;
    const query: any = getSchoolQuery(req);

    if (status) {
      query.status = status;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    if (parentId) {
      query.parentId = parentId;
    }

    const paymentAttempts = await PaymentAttempt.find(query)
      .populate('invoiceId')
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .sort({ createdAt: -1 });

    res.json(paymentAttempts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

