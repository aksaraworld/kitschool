export enum UserRole {
  SAAS_ADMIN = 'saas_admin',
  STUDENT = 'student',
  PARENT = 'parent',
  // Staff hierarchy (org chart) – staff can have multiple roles
  PRINCIPAL = 'principal',                    // Kepala Sekolah (per unit MTs/MA)
  KETUA_PESANTREN = 'ketua_pesantren',        // Ketua Pesantren
  KETUA_YAYASAN = 'ketua_yayasan',            // Ketua Yayasan
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
  UserRole.KETUA_YAYASAN,
  UserRole.KETUA_PESANTREN,
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
  UserRole.KETUA_YAYASAN,
  UserRole.KETUA_PESANTREN,
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
  [UserRole.KETUA_PESANTREN]: 'Ketua Pesantren',
  [UserRole.KETUA_YAYASAN]: 'Ketua Yayasan',
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

/** School leadership with full access to management pages. */
export function hasFullAccess(user: { role?: string; roles?: string[] } | null): boolean {
  return hasAnyRole(user, [UserRole.PRINCIPAL, UserRole.KETUA_PESANTREN, UserRole.KETUA_YAYASAN]);
}

/** Jenjang unit within a school (e.g. MTs, MA). */
export interface SchoolUnit {
  id: string;
  name: string;
  label?: string;
  principalUserId?: string;
  principalEmail?: string;
}

export interface SchoolLeadership {
  ketuaPesantrenUserId?: string;
  ketuaYayasanUserId?: string;
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
  { key: 'subjects', label: 'Mata Pelajaran' },
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
  { key: 'subjects', label: 'Mata Pelajaran' },
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
  EXCUSED = 'excused',
  /** Cuti (staff) */
  LEAVE = 'leave',
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
  /** Alamat – dapat diubah oleh siswa/ortu di profil/security */
  address?: string;
  /** Jika true, email siswa diberikan sekolah dan tidak boleh diubah oleh siswa */
  emailProvidedBySchool?: boolean;
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
  /** Boarding: student room assignment */
  boardingRoomId?: string;
  /** Boarding: perwakilan kamar (student, wakil) */
  isRoomCaptain?: boolean;
  /** Boarding: kepala kamar staff assignment */
  boardingRoomHeadId?: string;
  /** FCM device tokens for push notifications */
  fcmTokens?: string[];
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
  /** Ketua kelas (student id) */
  classPresidentId?: string;
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

/** Chat participant snapshot stored on conversation. */
export interface ChatParticipant {
  uid: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface ChatConversation {
  _id: string;
  schoolId: string;
  participantIds: string[];
  participants: Record<string, ChatParticipant>;
  /** direct = logged-in users; public_inquiry = website visitor → CS staff */
  kind?: 'direct' | 'public_inquiry';
  publicSessionId?: string;
  visitorName?: string;
  visitorContact?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  schoolId: string;
  senderId: string;
  /** visitor messages from public landing chat */
  senderType?: 'user' | 'visitor';
  senderName?: string;
  text: string;
  createdAt: string;
  readBy?: Record<string, string>;
}

/** Monthly chat archive for a user (messages older than retention window). */
export interface ChatBackupMonth {
  userId: string;
  schoolId: string;
  yearMonth: string;
  messageCount: number;
  updatedAt: string;
}

export interface ChatBackupEntry {
  conversationId: string;
  with: string;
  direction: 'sent' | 'received';
  text: string;
  createdAt: string;
}

export type AppNotificationType = 'chat' | 'communication' | 'ticket';

export type TicketCategory =
  | 'academic'
  | 'discipline'
  | 'facility'
  | 'finance'
  | 'boarding'
  | 'general';

export type TicketStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  _id: string;
  schoolId: string;
  ticketNumber: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  creatorId: string;
  creatorName: string;
  assignedToId?: string;
  assignedToName?: string;
  assigneeRoles?: string[];
  acknowledgedAt?: string;
  acknowledgedById?: string;
  acknowledgedByName?: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolvedByName?: string;
  resolutionNote?: string;
  parentNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  academic: 'Akademik / Pembelajaran',
  discipline: 'Kedisiplinan / BK',
  facility: 'Sarana & Prasarana',
  finance: 'Keuangan / SPP',
  boarding: 'Asrama / Pesantren',
  general: 'Lainnya / Umum',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Baru',
  acknowledged: 'Diterima',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  closed: 'Ditutup',
};

/** Roles suggested per ticket category (first match in school is auto-assigned). */
export const TICKET_CATEGORY_ASSIGNEE_ROLES: Record<TicketCategory, UserRole[]> = {
  academic: [UserRole.HOMEROOM_TEACHER, UserRole.WAKASEK_KURIKULUM, UserRole.TEACHER],
  discipline: [UserRole.KOORDINATOR_BK_ESKUL, UserRole.WAKASEK_KESISWAAN],
  facility: [UserRole.WAKASEK_SARANA, UserRole.STAFF],
  finance: [UserRole.FINANCE, UserRole.STAFF],
  boarding: [UserRole.KETUA_PESANTREN, UserRole.STAFF],
  general: [UserRole.STAFF, UserRole.PRINCIPAL],
};

export const TICKET_HANDLER_ROLES: UserRole[] = [
  UserRole.STAFF,
  UserRole.PRINCIPAL,
  UserRole.TEACHER,
  UserRole.HOMEROOM_TEACHER,
  UserRole.FINANCE,
  UserRole.WAKASEK_KURIKULUM,
  UserRole.WAKASEK_KESISWAAN,
  UserRole.WAKASEK_SARANA,
  UserRole.KOORDINATOR_BK_ESKUL,
  UserRole.KETUA_PESANTREN,
  UserRole.KETUA_YAYASAN,
];

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string;
  href: string;
  unread: boolean;
  count?: number;
  conversationId?: string;
}

/** Roles allowed to use school chat. */
export const CHAT_ROLES: UserRole[] = [
  UserRole.PARENT,
  UserRole.TEACHER,
  UserRole.HOMEROOM_TEACHER,
  UserRole.GURU_PRODUKTIF,
  UserRole.STAFF,
  UserRole.FINANCE,
  UserRole.PRINCIPAL,
  UserRole.KETUA_PESANTREN,
  UserRole.KETUA_YAYASAN,
  UserRole.WAKASEK_KURIKULUM,
  UserRole.WAKASEK_KESISWAAN,
  UserRole.WAKASEK_SARANA,
  UserRole.KEPALA_PROGRAM_KEAHLIAN,
  UserRole.KOORDINATOR_BK_ESKUL,
  UserRole.KOORDINATOR_LAB_PERPUS,
  UserRole.KAPRODI,
];

/** Staff roles that may message any parent (TU, billing, etc.). */
export const CHAT_BROADCAST_STAFF_ROLES: UserRole[] = [
  UserRole.STAFF,
  UserRole.FINANCE,
  UserRole.PRINCIPAL,
  UserRole.KETUA_PESANTREN,
  UserRole.KETUA_YAYASAN,
  UserRole.WAKASEK_KURIKULUM,
  UserRole.WAKASEK_KESISWAAN,
  UserRole.WAKASEK_SARANA,
  UserRole.KEPALA_PROGRAM_KEAHLIAN,
  UserRole.KOORDINATOR_BK_ESKUL,
  UserRole.KOORDINATOR_LAB_PERPUS,
  UserRole.KAPRODI,
];

export interface SchoolLandingHighlight {
  title: string;
  description: string;
}

export interface SchoolLandingProgram {
  title: string;
  description: string;
  badge?: string;
}

/** Public school landing page (optional per school). */
export interface SchoolLandingPage {
  enabled: boolean;
  slug: string;
  heroTitle?: string;
  heroSubtitle?: string;
  showContact?: boolean;
  highlights?: SchoolLandingHighlight[];
  programs?: SchoolLandingProgram[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  /** Live chat widget on public landing → customer service staff */
  publicChatEnabled?: boolean;
}

/** Enabled optional modules per school. */
export interface SchoolModules {
  boardingSchool?: boolean;
}

/** Phone rules for boarding students on school days. */
export interface BoardingPhonePolicy {
  /** Students may not hold phones during school days. */
  restrictOnSchoolDays: boolean;
  /** Room captain / representative may hold phone for the room. */
  roomCaptainCanHoldPhone: boolean;
}

export interface BoardingSchoolConfig {
  phonePolicy: BoardingPhonePolicy;
}

export type BoardingGender = 'male' | 'female';

/** Sleep wing or programme area (musholla, sports field, etc.). */
export interface BoardingArea {
  _id: string;
  schoolId: string;
  name: string;
  gender?: BoardingGender;
  description?: string;
  /** sleep = dormitory wing; programme = non-class activity zone */
  areaType: 'sleep' | 'programme';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardingRoom {
  _id: string;
  schoolId: string;
  areaId: string;
  name: string;
  gender: BoardingGender;
  capacity: number;
  roomCaptainId?: string;
  /** Kepala kamar — staff (bukan siswa perwakilan) */
  roomHeadStaffId?: string;
  studentIds: string[];
  floor?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type BoardingActivityType = 'tadarus' | 'kajian' | 'dzikir' | 'programme' | 'other';

/** Evening / off-timetable boarding activities. */
export interface BoardingActivitySchedule {
  _id: string;
  schoolId: string;
  title: string;
  activityType: BoardingActivityType;
  areaId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface School {
  _id: string;
  name: string;
  shortName?: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  /** Subdomain on SCHOOL_DOMAIN_BASE (e.g. al-um → al-um.kithome.id) */
  subdomain?: string;
  /** Optional full custom domain later (e.g. ppst-alum.sch.id) */
  customDomain?: string;
  /** Staff user id for public landing chat (customer service) */
  customerServiceStaffId?: string;
  landingPage?: SchoolLandingPage;
  modules?: SchoolModules;
  boardingConfig?: BoardingSchoolConfig;
  /** MTs / MA units — each can have its own kepala sekolah */
  units?: SchoolUnit[];
  leadership?: SchoolLeadership;
  schoolType?: string;
  jenjang?: string[];
  district?: string;
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
  /** Bobot matrix ranking Top 10: UAS/UTS/PR (persen, total 100) */
  rankingMatrix?: { wUas?: number; wUts?: number; wPr?: number };
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
