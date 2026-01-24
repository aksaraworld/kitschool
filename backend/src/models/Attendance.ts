import mongoose, { Schema, Document } from 'mongoose';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused'
}

export enum AttendanceType {
  STUDENT = 'student',
  TEACHER = 'teacher'
}

export interface IAttendance extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  userId: mongoose.Types.ObjectId;
  type: AttendanceType;
  date: Date;
  status: AttendanceStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  notes?: string;
  classId?: mongoose.Types.ObjectId; // For student attendance
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(AttendanceType),
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(AttendanceStatus),
    required: true
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  notes: {
    type: String
  },
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries - school-scoped
AttendanceSchema.index({ schoolId: 1, userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ schoolId: 1, classId: 1, date: 1 });
AttendanceSchema.index({ schoolId: 1, type: 1, date: 1 });
AttendanceSchema.index({ schoolId: 1 });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);

