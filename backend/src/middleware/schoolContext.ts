import { Request, Response, NextFunction } from 'express';
import { firestore } from '../config/firebase';
import { FirebaseAuthRequest } from './firebaseAuth';
import { UserRole } from '../types';

export interface SchoolContextRequest extends FirebaseAuthRequest {
  schoolId?: string;
  school?: any;
}

function normalizeHeaderSchoolId(v: any): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : String(v);
}

async function getSchoolDoc(schoolId: string) {
  const doc = await firestore.collection('schools').doc(schoolId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Middleware to set school context from Firebase custom claims or x-school-id
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
      const headerSchoolId = normalizeHeaderSchoolId(req.headers['x-school-id']);
      const schoolId =
        req.query.schoolId ||
        req.params.schoolId ||
        req.body.schoolId ||
        headerSchoolId;
      if (schoolId) {
        req.schoolId = schoolId as string;
        const school = await getSchoolDoc(req.schoolId);
        if (school) req.school = school;
      }
      return next();
    }

    // All other users must have schoolId from custom claims
    if (!req.user.uid) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return res.status(403).json({ message: 'User must be associated with a school' });
    }

    // Check if school is active
    const school = await getSchoolDoc(schoolId);
    if (!school || !school.isActive) {
      return res.status(403).json({ message: 'School is not active' });
    }

    // Check subscription status
    if (school.subscriptionStatus === 'suspended' || school.subscriptionStatus === 'cancelled') {
      return res.status(403).json({ message: 'School subscription is not active' });
    }

    req.schoolId = schoolId;
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

