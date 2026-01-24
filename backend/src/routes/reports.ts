import express from 'express';
import Attendance, { AttendanceStatus } from '../models/Attendance';
import Invoice, { InvoiceStatus } from '../models/Invoice';
import PaymentAttempt, { PaymentAttemptStatus } from '../models/PaymentAttempt';
import User, { UserRole } from '../models/User';
import Class from '../models/Class';
import StudentActivity from '../models/StudentActivity';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { setSchoolContext, SchoolContextRequest, requireSchoolContext, getSchoolQuery } from '../middleware/schoolContext';
import mongoose from 'mongoose';

const router = express.Router();

// Get attendance report
router.get('/attendance', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { startDate, endDate, classId, studentId, type } = req.query;
    const query: any = getSchoolQuery(req);

    // Students can only see their own attendance
    if (req.user?.role === UserRole.STUDENT) {
      query.userId = req.user.id;
    } else if (studentId) {
      query.userId = studentId;
    }

    if (classId) {
      query.classId = classId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('userId', 'name email studentId')
      .populate('classId', 'name')
      .sort({ date: -1 });

    // Calculate statistics
    const total = attendance.length;
    const present = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const late = attendance.filter(a => a.status === AttendanceStatus.LATE).length;
    const absent = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(2) : '0.00';

    res.json({
      data: attendance,
      statistics: {
        total,
        present,
        late,
        absent,
        attendanceRate: parseFloat(attendanceRate)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get payment/financial report
router.get('/payments', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { startDate, endDate, status, studentId, parentId } = req.query;
    const query: any = getSchoolQuery(req);

    // Parents can only see their own invoices
    if (req.user?.role === UserRole.PARENT) {
      query.parentId = req.user.id;
    } else if (parentId) {
      query.parentId = parentId;
    }

    if (studentId) {
      query.studentId = studentId;
    }

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const invoices = await Invoice.find(query)
      .populate('studentId', 'name studentId')
      .populate('parentId', 'name email')
      .sort({ dueDate: -1 });

    // Calculate statistics
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalRemaining = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PAID).length;
    const pendingInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PENDING).length;
    const partialInvoices = invoices.filter(inv => inv.status === InvoiceStatus.PARTIAL).length;
    const overdueInvoices = invoices.filter(inv => inv.status === InvoiceStatus.OVERDUE).length;
    const paymentRate = totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(2) : '0.00';

    res.json({
      data: invoices,
      statistics: {
        totalInvoices,
        totalAmount,
        totalPaid,
        totalRemaining,
        paidInvoices,
        pendingInvoices,
        partialInvoices,
        overdueInvoices,
        paymentRate: parseFloat(paymentRate)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get student report
router.get('/students', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { classId, year, major, isActive } = req.query;
    const query: any = getSchoolQuery(req);
    query.role = UserRole.STUDENT;

    if (classId) {
      query.classId = classId;
    }

    if (year) {
      query.year = parseInt(year as string);
    }

    if (major) {
      query.major = major;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const students = await User.find(query)
      .populate('classId', 'name')
      .sort({ studentId: 1 });

    // Calculate statistics
    const totalStudents = students.length;
    const byYear = students.reduce((acc: any, student) => {
      const year = student.year || 'Unknown';
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});
    const byMajor = students.reduce((acc: any, student) => {
      const major = student.major || 'Unknown';
      acc[major] = (acc[major] || 0) + 1;
      return acc;
    }, {});
    const byClass = students.reduce((acc: any, student) => {
      const className = (student.classId as any)?.name || 'Unknown';
      acc[className] = (acc[className] || 0) + 1;
      return acc;
    }, {});

    res.json({
      data: students,
      statistics: {
        totalStudents,
        byYear,
        byMajor,
        byClass
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get academic report (student activities, grades, etc.)
router.get('/academic', authenticate, setSchoolContext, requireSchoolContext, async (req: SchoolContextRequest, res) => {
  try {
    const { startDate, endDate, classId, studentId, type } = req.query;
    const query: any = getSchoolQuery(req);

    // Students can only see their own activities
    if (req.user?.role === UserRole.STUDENT) {
      query.studentId = req.user.id;
    } else if (studentId) {
      query.studentId = studentId;
    }

    if (classId) {
      query.classId = classId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const activities = await StudentActivity.find(query)
      .populate('studentId', 'name studentId')
      .populate('classId', 'name')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    // Calculate statistics
    const totalActivities = activities.length;
    const byType = activities.reduce((acc: any, activity) => {
      const type = activity.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      data: activities,
      statistics: {
        totalActivities,
        byType
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get comprehensive dashboard report (for Principal, Staff, Finance)
router.get('/dashboard', authenticate, setSchoolContext, requireSchoolContext, authorize(UserRole.PRINCIPAL, UserRole.STAFF, UserRole.FINANCE), async (req: SchoolContextRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = getSchoolQuery(req);

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get counts
    const totalStudents = await User.countDocuments({ ...query, role: UserRole.STUDENT, isActive: true });
    const totalTeachers = await User.countDocuments({ ...query, role: { $in: [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER] }, isActive: true });
    const totalClasses = await Class.countDocuments({ ...query, isActive: true });

    // Get attendance stats
    const attendanceQuery = {
      ...query,
      date: { $gte: start, $lte: end },
      type: 'student'
    };
    const totalAttendance = await Attendance.countDocuments(attendanceQuery);
    const presentAttendance = await Attendance.countDocuments({ ...attendanceQuery, status: AttendanceStatus.PRESENT });
    const attendanceRate = totalAttendance > 0 ? ((presentAttendance / totalAttendance) * 100).toFixed(2) : '0.00';

    // Get payment stats
    const paymentQuery = {
      ...query,
      dueDate: { $gte: start, $lte: end }
    };
    const totalInvoices = await Invoice.countDocuments(paymentQuery);
    const paidInvoices = await Invoice.countDocuments({ ...paymentQuery, status: InvoiceStatus.PAID });
    const totalInvoiceAmount = await Invoice.aggregate([
      { $match: paymentQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPaidAmount = await Invoice.aggregate([
      { $match: { ...paymentQuery, status: InvoiceStatus.PAID } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    // Get student activities
    const activityQuery = {
      ...query,
      date: { $gte: start, $lte: end }
    };
    const totalActivities = await StudentActivity.countDocuments(activityQuery);

    res.json({
      overview: {
        totalStudents,
        totalTeachers,
        totalClasses
      },
      attendance: {
        total: totalAttendance,
        present: presentAttendance,
        rate: parseFloat(attendanceRate)
      },
      payments: {
        totalInvoices,
        paidInvoices,
        totalAmount: totalInvoiceAmount[0]?.total || 0,
        totalPaid: totalPaidAmount[0]?.total || 0,
        paymentRate: totalInvoiceAmount[0]?.total > 0 
          ? ((totalPaidAmount[0]?.total || 0) / totalInvoiceAmount[0].total * 100).toFixed(2)
          : '0.00'
      },
      activities: {
        total: totalActivities
      },
      period: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;


