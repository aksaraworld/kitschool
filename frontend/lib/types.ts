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
  studentId?: string;
  classId?: string;
  year?: number;
  major?: string;
  children?: string[];
  teacherId?: string;
  assignedClasses?: string[];
  isHomeroom?: boolean;
  homeroomClassId?: string;
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
