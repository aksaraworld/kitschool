# Cognifa Database Schema

## Overview
MongoDB database schema for Cognifa school management system.

## Collections

### roleDefinitions
Stores configurable role definitions per school. Used for role management (access, approvals, CRUD).

**Fields:**
- `schoolId` (string, required)
- `roleKey` (string, required, unique per school, e.g. principal, wakasek_kurikulum)
- `displayName` (string, required)
- `permissions` (object):
  - `pageAccess` (string[], page keys the role can access)
  - `approvals` (string[], approval types: leave, admission, payment)
  - `resources` (Record<string, {create, read, update, delete}>)
- `createdAt`, `updatedAt` (Date)

### Users
Stores all user accounts (students, parents, teachers, staff, principal, finance).

**Fields:**
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `name` (String, required)
- `role` (Enum: student, parent, teacher, homeroom_teacher/wali_kelas, staff, principal, finance, wakasek_*, kepala_program_keahlian, koordinator_*, kaprodi, guru_produktif)
- `phone` (String, optional)
- `avatar` (String, optional)
- `isActive` (Boolean, default: true)

**Student-specific:**
- `studentId` (String, unique, sparse)
- `classId` (ObjectId, ref: Class)
- `year` (Number)
- `major` (String)

**Parent-specific:**
- `children` (Array of ObjectId, ref: User)

**Teacher-specific:**
- `teacherId` (String, unique, sparse)
- `assignedClasses` (Array of ObjectId, ref: Class)
- `isHomeroom` (Boolean, default: false)
- `homeroomClassId` (ObjectId, ref: Class)

**Staff/Principal/Finance-specific:**
- `employeeId` (String, unique, sparse)
- `department` (String)

**Indexes:**
- email
- role
- studentId
- teacherId
- employeeId
- classId

### Years
Academic years (e.g., 2024/2025).

**Fields:**
- `name` (String, required, unique)
- `startDate` (Date, required)
- `endDate` (Date, required)
- `isActive` (Boolean, default: true)

### Majors
School majors/programs (e.g., Science, Social Studies).

**Fields:**
- `name` (String, required)
- `code` (String, required, unique, uppercase)
- `description` (String, optional)
- `isActive` (Boolean, default: true)

### Classes
Class groups within a year and major.

**Fields:**
- `name` (String, required, e.g., "10A")
- `yearId` (ObjectId, ref: Year, required)
- `majorId` (ObjectId, ref: Major, required)
- `homeroomTeacherId` (ObjectId, ref: User) – Wali Kelas
- `studentIds` (Array of ObjectId, ref: User)
- `capacity` (Number, default: 40)
- `isActive` (Boolean, default: true)

**Indexes:**
- Compound: name, yearId, majorId (unique)

### Attendance
Attendance records for students and teachers.

**Fields:**
- `userId` (ObjectId, ref: User, required)
- `type` (Enum: student, teacher, required)
- `date` (Date, required)
- `status` (Enum: present, absent, late, excused, required)
- `checkInTime` (Date, optional)
- `checkOutTime` (Date, optional)
- `notes` (String, optional)
- `classId` (ObjectId, ref: Class, optional, for student attendance)

**Indexes:**
- Compound: userId, date (unique)
- classId, date
- type, date

### Payments
Monthly fee payments.

**Fields:**
- `studentId` (ObjectId, ref: User, required)
- `parentId` (ObjectId, ref: User, required)
- `amount` (Number, required, min: 0)
- `dueDate` (Date, required)
- `paidDate` (Date, optional)
- `status` (Enum: pending, paid, overdue, cancelled, default: pending)
- `month` (Number, required, 1-12)
- `year` (Number, required)
- `description` (String, optional)
- `paymentMethod` (String, optional)
- `transactionId` (String, optional)
- `receiptUrl` (String, optional)
- `notes` (String, optional)

**Indexes:**
- Compound: studentId, month, year (unique)
- parentId
- status
- dueDate

### Schedules
Class schedules, events, exams, holidays.

**Fields:**
- `title` (String, required)
- `description` (String, optional)
- `startDate` (Date, required)
- `endDate` (Date, optional)
- `startTime` (String, optional, HH:mm format)
- `endTime` (String, optional, HH:mm format)
- `classId` (ObjectId, ref: Class, optional)
- `createdBy` (ObjectId, ref: User, required)
- `type` (Enum: class, school, exam, holiday, event, default: class)
- `isRecurring` (Boolean, default: false)
- `recurringPattern` (Object, optional)
  - `frequency` (Enum: daily, weekly, monthly)
  - `interval` (Number, default: 1)
  - `endDate` (Date, optional)
- `isAllDay` (Boolean, default: false)

**Indexes:**
- classId, startDate
- startDate, endDate
- type

### Communications
Messages between users (parents, teachers, staff).

**Fields:**
- `from` (ObjectId, ref: User, required)
- `to` (ObjectId, ref: User, required)
- `subject` (String, required)
- `message` (String, required)
- `isRead` (Boolean, default: false)
- `readAt` (Date, optional)
- `parentMessageId` (ObjectId, ref: Communication, optional, for replies)
- `attachments` (Array of String, optional)

**Indexes:**
- from, createdAt
- to, isRead, createdAt
- parentMessageId

### StudentActivities
Student activity logs for parent monitoring.

**Fields:**
- `studentId` (ObjectId, ref: User, required)
- `type` (Enum: attendance, assignment, exam, behavior, achievement, other)
- `title` (String, required)
- `description` (String, optional)
- `date` (Date, required)
- `classId` (ObjectId, ref: Class, optional)
- `createdBy` (ObjectId, ref: User, required)
- `metadata` (Object, optional, for additional data)

**Indexes:**
- studentId, date
- classId, date
- type

## Relationships

### Hierarchy
- Year > Major > Class > Students
- Each class has one homeroom teacher
- Each class contains multiple students
- Parents can have multiple children (students)

### Access Control
- Students can only see their own data
- Parents can see their children's data
- Teachers can see their assigned classes
- Staff/Principal can see all data
- Finance can see payment-related data

## Notes
- All timestamps are automatically managed by Mongoose (createdAt, updatedAt)
- Soft deletes are implemented using `isActive` flag
- All IDs use MongoDB ObjectId
- Passwords are hashed using bcrypt

