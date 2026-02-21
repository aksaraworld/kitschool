export enum UserRole {
  SAAS_ADMIN = 'saas_admin',
  STUDENT = 'student',
  PARENT = 'parent',
  // Staff hierarchy (org chart) – staff can have multiple roles
  PRINCIPAL = 'principal',                    // Kepala Sekolah
  WAKASEK_KURIKULUM = 'wakasek_kurikulum',   // Wakasek Kurikulum
  WAKASEK_KESISWAAN = 'wakasek_kesiswaan',   // Wakasek Kesiswaan
  WAKASEK_SARANA = 'wakasek_sarana',         // Wakasek Sarana Prasarana
  KEPALA_PROGRAM_KEAHLIAN = 'kepala_program_keahlian', // Kepala Program Keahlian
  KOORDINATOR_BK_ESKUL = 'koordinator_bk_eskul',       // Koordinator BK & Eskul
  KOORDINATOR_LAB_PERPUS = 'koordinator_lab_perpus',   // Koordinator Lab & Perpus
  KAPRODI = 'kaprodi',                       // Kaprodi (Head of Study Program)
  GURU_PRODUKTIF = 'guru_produktif',         // Guru Produktif
  HOMEROOM_TEACHER = 'homeroom_teacher',     // Wali Kelas
  TEACHER = 'teacher',                       // Guru (generic)
  STAFF = 'staff',                           // Staf (generic)
  FINANCE = 'finance'                        // Keuangan
}

/** Staff roles only – students and parents have a single role. */
export const STAFF_ROLES: UserRole[] = [
  UserRole.PRINCIPAL,
  UserRole.WAKASEK_KURIKULUM,
  UserRole.WAKASEK_KESISWAAN,
  UserRole.WAKASEK_SARANA,
  UserRole.KEPALA_PROGRAM_KEAHLIAN,
  UserRole.KOORDINATOR_BK_ESKUL,
  UserRole.KOORDINATOR_LAB_PERPUS,
  UserRole.KAPRODI,
  UserRole.GURU_PRODUKTIF,
  UserRole.HOMEROOM_TEACHER,
  UserRole.TEACHER,
  UserRole.STAFF,
  UserRole.FINANCE,
];

/** Roles that can manage users (Pengguna page). */
export const ROLES_CAN_MANAGE_USERS: UserRole[] = [
  UserRole.PRINCIPAL,
  UserRole.WAKASEK_KURIKULUM,
  UserRole.WAKASEK_KESISWAAN,
  UserRole.WAKASEK_SARANA,
  UserRole.KEPALA_PROGRAM_KEAHLIAN,
  UserRole.KOORDINATOR_BK_ESKUL,
  UserRole.KOORDINATOR_LAB_PERPUS,
  UserRole.KAPRODI,
  UserRole.STAFF,
];

export const ROLE_LABELS: Record<string, string> = {
  [UserRole.SAAS_ADMIN]: 'SaaS Admin',
  [UserRole.STUDENT]: 'Siswa',
  [UserRole.PARENT]: 'Orang Tua',
  [UserRole.PRINCIPAL]: 'Kepala Sekolah',
  [UserRole.WAKASEK_KURIKULUM]: 'Wakasek Kurikulum',
  [UserRole.WAKASEK_KESISWAAN]: 'Wakasek Kesiswaan',
  [UserRole.WAKASEK_SARANA]: 'Wakasek Sarana Prasarana',
  [UserRole.KEPALA_PROGRAM_KEAHLIAN]: 'Kepala Program Keahlian',
  [UserRole.KOORDINATOR_BK_ESKUL]: 'Koordinator BK & Eskul',
  [UserRole.KOORDINATOR_LAB_PERPUS]: 'Koordinator Lab & Perpus',
  [UserRole.KAPRODI]: 'Kaprodi',
  [UserRole.GURU_PRODUKTIF]: 'Guru Produktif',
  [UserRole.HOMEROOM_TEACHER]: 'Wali Kelas',
  [UserRole.TEACHER]: 'Guru',
  [UserRole.STAFF]: 'Staf',
  [UserRole.FINANCE]: 'Keuangan',
};

/** Returns effective roles for a user (role + roles). Students/parents have single role. */
export function getEffectiveRoles(user: { role?: string; roles?: string[] }): string[] {
  if (!user) return [];
  const roles = user.roles ?? [];
  const primary = user.role ?? '';
  if (primary && !roles.includes(primary)) return [primary, ...roles];
  return roles.length ? roles : (primary ? [primary] : []);
}

/** Returns true if user has any of the given roles. */
export function hasAnyRole(user: { role?: string; roles?: string[] } | null, allowed: string[]): boolean {
  if (!user || !allowed.length) return false;
  const effective = getEffectiveRoles(user);
  return effective.some((r) => allowed.includes(r));
}

/** Kepala Sekolah has full access to all pages and functions. */
export function hasFullAccess(user: { role?: string; roles?: string[] } | null): boolean {
  return hasAnyRole(user, [UserRole.PRINCIPAL]);
}

/** Resource CRUD permission. */
export interface ResourcePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

/** Role definition stored in DB – configurable per school. */
export interface RoleDefinition {
  _id: string;
  schoolId: string;
  roleKey: string;
  displayName: string;
  permissions: {
    pageAccess: string[];
    approvals: string[];
    resources: Record<string, ResourcePermission>;
  };
  createdAt?: string;
  updatedAt?: string;
}

/** Available pages for role access config. */
export const ROLE_PAGES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'Profil' },
  { key: 'users', label: 'Pengguna' },
  { key: 'classes', label: 'Kelas' },
  { key: 'years', label: 'Tahun Ajaran' },
  { key: 'majors', label: 'Jurusan' },
  { key: 'schedules', label: 'Jadwal' },
  { key: 'attendance', label: 'Kehadiran' },
  { key: 'invoices', label: 'Tagihan' },
  { key: 'payments', label: 'Pembayaran' },
  { key: 'reports', label: 'Laporan' },
  { key: 'school-profile', label: 'Profil Sekolah' },
  { key: 'messages', label: 'Pesan' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'children', label: 'Anak Saya' },
  { key: 'role-management', label: 'Kelola Peran' },
] as const;

/** Available resources for CRUD config. */
export const ROLE_RESOURCES = [
  { key: 'users', label: 'Pengguna' },
  { key: 'classes', label: 'Kelas' },
  { key: 'years', label: 'Tahun Ajaran' },
  { key: 'majors', label: 'Jurusan' },
  { key: 'schedules', label: 'Jadwal' },
  { key: 'attendance', label: 'Kehadiran' },
  { key: 'invoices', label: 'Tagihan' },
  { key: 'medicalRecords', label: 'Rekam Medis' },
  { key: 'leaveRequests', label: 'Cuti' },
] as const;

/** Available approval types. "Requires approval" = when this role does it, needs Principal sign-off. */
export const ROLE_APPROVALS = [
  { key: 'leave', label: 'Cuti' },
  { key: 'admission', label: 'Penerimaan' },
  { key: 'payment', label: 'Pembayaran' },
  { key: 'class_create', label: 'Pembuatan Kelas (perlu persetujuan Kepala Sekolah)' },
] as const;

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum PaymentAttemptStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  E_WALLET = 'e_wallet',
  CASH = 'cash',
  OTHER = 'other'
}

export interface User {
  _id: string;
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  /** Additional roles for staff only; students and parents have single role. */
  roles?: string[];
  phone?: string;
  avatar?: string;
  isActive: boolean;
  /** NISN – students only (Nomor Induk Siswa Nasional, 10-digit national ID) */
  nisn?: string;
  /** Admission No – students only (school-facing ID) */
  admissionNo?: string;
  /** NIP – teachers, staff, principal, finance (Nomor Induk Pegawai) */
  nip?: string;
  /** @deprecated use nisn */
  studentId?: string;
  classId?: string;
  year?: number;
  major?: string;
  children?: string[];
  /** @deprecated use nip */
  teacherId?: string;
  assignedClasses?: string[];
  isHomeroom?: boolean;
  homeroomClassId?: string;
  /** @deprecated use nip */
  employeeId?: string;
  department?: string;
  schoolId?: string;
  school?: {
    id: string;
    name: string;
    subscriptionStatus?: SubscriptionStatus;
    subscriptionPlan?: string;
  } | null;
}

export interface Class {
  _id: string;
  name: string;
  yearId: string;
  majorId: string;
  homeroomTeacherId: string;
  studentIds: string[];
  capacity: number;
  isActive: boolean;
  /** pending = needs Principal approval; approved = visible to all */
  approvalStatus?: 'pending' | 'approved';
  createdBy?: string;
}

export interface Attendance {
  _id: string;
  userId: string;
  type: 'student' | 'teacher';
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  classId?: string;
}

export interface Payment {
  _id: string;
  studentId: string;
  parentId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  month: number;
  year: number;
  description?: string;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  studentId: string;
  parentId: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  description?: string;
  items: {
    description: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  month?: number;
  year?: number;
  createdBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAttempt {
  _id: string;
  invoiceId: string;
  studentId: string;
  parentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentAttemptStatus;
  transactionId?: string;
  paymentReference?: string;
  receiptUrl?: string;
  proofOfPayment?: string;
  notes?: string;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  classId?: string;
  subjectId?: string;
  createdBy: string;
  type: 'class' | 'school' | 'exam' | 'holiday' | 'event';
  isRecurring: boolean;
  isAllDay: boolean;
}

export interface Communication {
  _id: string;
  from: User;
  to: User;
  subject: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  parentMessageId?: string;
  attachments?: string[];
  createdAt: string;
}

export interface School {
  _id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  taxId?: string;
  accreditation?: string;
  establishedYear?: number;
  description?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionFeePerStudent?: number | null;
  maxUsers?: number;
  maxStudents?: number;
  billingEmail?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  paymentMethod?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Configuration {
  key: string;
  name?: string;
  value: number;
  description?: string;
  type: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionFeeBreakdown {
  paymentGateway: number;
  platform: number;
  tax: number;
}

export interface TransactionFeeStatistics {
  totalTransactions: number;
  totalTransactionAmount: number;
  totalAdminFee: number;
  totalNetAmount: number;
  feeBreakdown: TransactionFeeBreakdown;
}

// === Student Information System (from CSV) ===

export enum AdmissionStatus {
  PENDING = 'pending',
  INTERVIEW = 'interview',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export enum LeaveType {
  SICK = 'sick',
  VACATION = 'vacation',
  PERSONAL = 'personal'
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied'
}

export enum FeeFrequency {
  MONTHLY = 'monthly',
  TERMLY = 'termly',
  YEARLY = 'yearly'
}

export enum ResourceType {
  VIDEO = 'video',
  PDF = 'pdf',
  LINK = 'link',
  DOCUMENT = 'document'
}

/** Vaccination entry for student health record */
export interface VaccinationEntry {
  name: string;
  date?: string;
  notes?: string;
}

/**
 * Medical record – added manually by school staff for prevention & safe school operations.
 * Covers allergies, vaccinations, do's/don'ts, illness history.
 */
export interface MedicalRecord {
  _id: string;
  schoolId: string;
  studentId: string;
  bloodGroup?: string;
  /** Allergies (food, dust, pollen, etc.) */
  allergies?: string;
  /** Current medications (if any) */
  medications?: string;
  emergencyPhone?: string;
  /** Vaccination record (BCG, DPT, polio, etc.) */
  vaccinations?: VaccinationEntry[];
  /** Do's and Don'ts – precautions for school staff (e.g. avoid sun, no peanuts) */
  doAndDonts?: string;
  /** Medical history of past illnesses (asthma, seizures, etc.) */
  illnessHistory?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Admission {
  _id: string;
  schoolId: string;
  applicantName: string;
  targetGrade: string;
  submissionDate: string;
  status: AdmissionStatus;
  docUrlJson?: string;
  reviewerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeStructure {
  _id: string;
  schoolId: string;
  name: string;
  amountBase: number;
  frequency: FeeFrequency;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  _id: string;
  schoolId: string;
  staffId: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollLog {
  _id: string;
  schoolId: string;
  staffId: string;
  netPay: number;
  disburseDate: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  _id: string;
  schoolId: string;
  name: string;
  code?: string;
  categoryId?: string;
  teacherId?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectCategory {
  _id: string;
  schoolId: string;
  name: string;
  code?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SchoolLevel = 'tk' | 'sd' | 'smp' | 'sma' | 'smk';

export interface GradingComponent {
  key: string;
  label: string;
  weight: number;
  minScore?: number;
  maxScore?: number;
}

export interface AttitudeConfig {
  spiritual?: { scale: string[] };
  social?: { scale: string[] };
}

export interface PredicateMapping {
  minNumeric: number;
  maxNumeric: number;
  letter: string;
  description?: string;
}

export interface GradingConfig {
  _id: string;
  schoolId: string;
  level: SchoolLevel;
  name: string;
  isActive?: boolean;
  components: GradingComponent[];
  attitudeConfig?: AttitudeConfig;
  predicateMappings?: PredicateMapping[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectGradingConfig {
  _id: string;
  schoolId: string;
  subjectId: string;
  gradingConfigId: string;
  level: SchoolLevel;
  componentOverrides?: { key: string; weight: number }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TkDevelopmentArea {
  _id: string;
  schoolId: string;
  gradingConfigId: string;
  areaKey: string;
  label: string;
  scale: string[];
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradeComponent {
  _id: string;
  schoolId: string;
  studentId: string;
  subjectId: string;
  classId?: string;
  yearId: string;
  semester: 1 | 2;
  componentKey: string;
  componentLabel?: string;
  numericScore?: number;
  letterScore?: string;
  descriptiveScore?: string;
  maxScore?: number;
  examId?: string;
  teacherId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculatedGrade {
  subjectId: string;
  subjectName?: string;
  numeric: number;
  letter: string;
  predicate?: string;
  components: { key: string; label: string; score: number; weight: number }[];
  /** TK only: development area → descriptive score (BB/MB/BSH/BSB) */
  descriptiveComponents?: { key: string; label: string; value: string }[];
  attitude?: { spiritual?: string; social?: string };
}

export interface Room {
  _id: string;
  schoolId: string;
  name: string;
  capacity?: number;
  building?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Exam {
  _id: string;
  schoolId: string;
  title: string;
  subjectId: string;
  maxMarks: number;
  weightage?: number;
  examDate?: string;
  classId?: string;
  academicYear?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Grade {
  _id: string;
  schoolId: string;
  studentId: string;
  examId?: string;
  subjectId?: string;
  classId?: string;
  yearId?: string;
  semester?: 1 | 2;
  componentKey?: string;
  marksObtained: number;
  maxMarks?: number;
  letterGrade?: string;
  predicate?: string;
  teacherComments?: string;
  developmentArea?: string;
  descriptiveScore?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Assignment {
  _id: string;
  schoolId: string;
  classId: string;
  title: string;
  description?: string;
  fileUrl?: string;
  dueDate: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentSubmission {
  _id: string;
  schoolId: string;
  assignmentId: string;
  studentId: string;
  contentUrl?: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resource {
  _id: string;
  schoolId: string;
  subjectId: string;
  type: ResourceType;
  title: string;
  url?: string;
  fileUrl?: string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
