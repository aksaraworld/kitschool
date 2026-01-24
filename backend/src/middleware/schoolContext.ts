import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import School from '../models/School';
import { AuthRequest } from './auth';
import { UserRole } from '../models/User';

export interface SchoolContextRequest extends AuthRequest {
  schoolId?: string;
  school?: any;
}

// Middleware to set school context from user's schoolId
export const setSchoolContext = async (
  req: SchoolContextRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    // SaaS Admin can access all schools (no schoolId required)
    if (req.user.role === UserRole.SAAS_ADMIN) {
      // Allow SaaS Admin to pass school context via query/params/body/header
      const headerSchoolId = req.headers['x-school-id'];
      const normalizedHeaderSchoolId = Array.isArray(headerSchoolId) ? headerSchoolId[0] : headerSchoolId;
      const schoolId =
        req.query.schoolId ||
        req.params.schoolId ||
        req.body.schoolId ||
        normalizedHeaderSchoolId;
      if (schoolId) {
        req.schoolId = schoolId as string;
        const school = await School.findById(schoolId);
        if (school) {
          req.school = school;
        }
      }
      return next();
    }

    // All other users must have schoolId
    if (!req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.schoolId) {
      return res.status(403).json({ message: 'User must be associated with a school' });
    }

    // Check if school is active
    const school = await School.findById(user.schoolId);
    if (!school || !school.isActive) {
      return res.status(403).json({ message: 'School is not active' });
    }

    // Check subscription status
    if (school.subscriptionStatus === 'suspended' || school.subscriptionStatus === 'cancelled') {
      return res.status(403).json({ message: 'School subscription is not active' });
    }

    req.schoolId = user.schoolId.toString();
    req.school = school;

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error setting school context', error });
  }
};

// Middleware to require school context (except for SaaS Admin)
export const requireSchoolContext = (
  req: SchoolContextRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role === UserRole.SAAS_ADMIN) {
    return next();
  }

  if (!req.schoolId) {
    return res.status(403).json({ message: 'School context required' });
  }

  next();
};

// Helper to get school-scoped query
export const getSchoolQuery = (req: SchoolContextRequest) => {
  if (req.user?.role === UserRole.SAAS_ADMIN) {
    // SaaS Admin can query by schoolId if provided
    if (req.schoolId) {
      return { schoolId: req.schoolId };
    }
    // Otherwise, no filter (can see all)
    return {};
  }
  
  // All other users are scoped to their school
  return { schoolId: req.schoolId };
};

