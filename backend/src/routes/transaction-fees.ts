import express from 'express';
import TransactionFee from '../models/TransactionFee';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import { UserRole } from '../models/User';

const router = express.Router();

// Get transaction fees (SaaS Admin can see all, Finance/Staff/Principal see their school)
router.get('/', authenticate, setSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const query: any = getSchoolQuery(req);
    const { status, startDate, endDate } = req.query;

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const transactionFees = await TransactionFee.find(query)
      .populate('schoolId', 'name')
      .populate('invoiceId')
      .sort({ createdAt: -1 });

    res.json(transactionFees);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get transaction fee by invoice ID
router.get('/invoice/:invoiceId', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const transactionFee = await TransactionFee.findOne({
      invoiceId: req.params.invoiceId,
      schoolId: req.schoolId
    })
      .populate('schoolId', 'name')
      .populate('invoiceId');

    if (!transactionFee) {
      return res.status(404).json({ message: 'Transaction fee not found' });
    }

    res.json(transactionFee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get transaction fee statistics (SaaS Admin only)
router.get('/statistics', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query: any = { status: 'calculated' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const fees = await TransactionFee.find(query);

    const statistics = {
      totalTransactions: fees.length,
      totalTransactionAmount: fees.reduce((sum, fee) => sum + fee.transactionAmount, 0),
      totalAdminFee: fees.reduce((sum, fee) => sum + fee.adminFeeAmount, 0),
      totalNetAmount: fees.reduce((sum, fee) => sum + fee.netAmount, 0),
      feeBreakdown: {
        paymentGateway: fees.reduce((sum, fee) => sum + fee.feeBreakdown.paymentGateway, 0),
        platform: fees.reduce((sum, fee) => sum + fee.feeBreakdown.platform, 0),
        tax: fees.reduce((sum, fee) => sum + fee.feeBreakdown.tax, 0)
      }
    };

    res.json(statistics);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Mark transaction fee as settled (SaaS Admin only)
router.put('/:id/settle', authenticate, authorize(UserRole.SAAS_ADMIN), async (req, res) => {
  try {
    const transactionFee = await TransactionFee.findByIdAndUpdate(
      req.params.id,
      {
        status: 'settled',
        settledAt: new Date()
      },
      { new: true }
    );

    if (!transactionFee) {
      return res.status(404).json({ message: 'Transaction fee not found' });
    }

    res.json(transactionFee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;


