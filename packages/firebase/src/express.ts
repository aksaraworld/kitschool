/**
 * Express helpers for Firebase Admin authentication.
 *
 * Server-only: import via `@aksara/firebase/express`
 * (Do not import from browser bundles.)
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from './admin';

export type FirebaseExpressUser = {
  uid: string;
  email?: string;
  role?: string;
  schoolId?: string;
  claims?: Record<string, any>;
};

export interface FirebaseAuthedRequest extends Request {
  user?: FirebaseExpressUser;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

export function firebaseAuthenticate() {
  return async (req: FirebaseAuthedRequest, res: Response, next: NextFunction) => {
    try {
      const token = getBearerToken(req);
      if (!token) return res.status(401).json({ message: 'No token provided' });

      const decoded = await verifyIdToken(token);
      if (!decoded) return res.status(401).json({ message: 'Invalid token' });

      const role = (decoded as any).role as string | undefined;
      const schoolId = (decoded as any).schoolId as string | undefined;

      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role,
        schoolId,
        claims: decoded as any,
      };

      next();
    } catch (err) {
      // Keep it opaque for clients; log upstream if desired
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

export function firebaseAuthorize(...roles: string[]) {
  return (req: FirebaseAuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (roles.length === 0) return next();
    if (!req.user.role) return res.status(403).json({ message: 'Forbidden' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

