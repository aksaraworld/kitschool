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
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  examId: string;
  marksObtained: number;
  teacherComments?: string;
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
