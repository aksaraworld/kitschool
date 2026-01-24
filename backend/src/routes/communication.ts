import express from 'express';
import Communication from '../models/Communication';
import { authenticate, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';

const router = express.Router();

// Get communications (inbox)
router.get('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { type } = req.query; // 'sent' or 'received'
    const query: any = getSchoolQuery(req);

    if (type === 'sent') {
      query.from = req.user?.id;
    } else {
      query.to = req.user?.id;
    }

    const communications = await Communication.find(query)
      .populate('from', 'name email role avatar')
      .populate('to', 'name email role avatar')
      .populate('parentMessageId')
      .sort({ createdAt: -1 });

    res.json(communications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Create communication
router.post('/', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const communication = new Communication({
      ...req.body,
      schoolId: req.schoolId,
      from: req.user?.id
    });
    await communication.save();
    const populated = await Communication.findById(communication._id)
      .populate('from', 'name email role avatar')
      .populate('to', 'name email role avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Mark as read
router.put('/:id/read', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const communication = await Communication.findById(req.params.id);
    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    // Check school access
    if (communication.schoolId.toString() !== req.schoolId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (communication.to.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    communication.isRead = true;
    communication.readAt = new Date();
    await communication.save();

    res.json(communication);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;

