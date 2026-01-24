/**
 * Firebase Authentication Middleware
 * Replaces JWT authentication with Firebase Auth
 */

import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../config/firebase';
import { AuthUser, UserRole } from '../types';

export interface FirebaseAuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (
  req: FirebaseAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decodedToken = await verifyFirebaseToken(idToken);

    if (!decodedToken) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Get custom claims (role, schoolId)
    const role = decodedToken.role as UserRole || decodedToken.role;
    const schoolId = decodedToken.schoolId as string | undefined;

    // Check if user is active (you may want to check Firestore for this)
    // For now, we'll trust Firebase Auth

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: role,
      schoolId: schoolId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: FirebaseAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};
