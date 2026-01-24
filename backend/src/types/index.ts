/**
 * Shared types for backend
 */

export enum UserRole {
  SAAS_ADMIN = 'saas_admin',
  STUDENT = 'student',
  PARENT = 'parent',
  TEACHER = 'teacher',
  HOMEROOM_TEACHER = 'homeroom_teacher',
  STAFF = 'staff',
  PRINCIPAL = 'principal',
  FINANCE = 'finance'
}

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
  schoolId?: string;
}
