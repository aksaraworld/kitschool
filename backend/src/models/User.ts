import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  SAAS_ADMIN = 'saas_admin', // Internal SaaS platform admin
  STUDENT = 'student',
  PARENT = 'parent',
  TEACHER = 'teacher',
  HOMEROOM_TEACHER = 'homeroom_teacher',
  STAFF = 'staff',
  PRINCIPAL = 'principal', // School admin/principal
  FINANCE = 'finance'
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  schoolId?: mongoose.Types.ObjectId; // Required for all roles except SAAS_ADMIN
  phone?: string;
  avatar?: string;
  isActive: boolean;
  // Student specific
  studentId?: string;
  classId?: mongoose.Types.ObjectId;
  year?: number;
  major?: string;
  // Parent specific
  children?: mongoose.Types.ObjectId[]; // Array of student IDs
  // Teacher specific
  teacherId?: string;
  assignedClasses?: mongoose.Types.ObjectId[]; // Array of class IDs
  isHomeroom?: boolean;
  homeroomClassId?: mongoose.Types.ObjectId;
  // Staff/Principal/Finance
  employeeId?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true
  },
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: function(this: IUser) {
      return this.role !== UserRole.SAAS_ADMIN;
    },
    sparse: true
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Student fields
  studentId: {
    type: String,
    sparse: true,
    unique: true
  },
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    sparse: true
  },
  year: {
    type: Number
  },
  major: {
    type: String
  },
  // Parent fields
  children: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Teacher fields
  teacherId: {
    type: String,
    sparse: true,
    unique: true
  },
  assignedClasses: [{
    type: Schema.Types.ObjectId,
    ref: 'Class'
  }],
  isHomeroom: {
    type: Boolean,
    default: false
  },
  homeroomClassId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    sparse: true
  },
  // Staff fields
  employeeId: {
    type: String,
    sparse: true,
    unique: true
  },
  department: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ schoolId: 1 }); // Critical for multi-tenancy
UserSchema.index({ schoolId: 1, role: 1 }); // Compound index for school-scoped queries
UserSchema.index({ studentId: 1 }, { sparse: true });
UserSchema.index({ teacherId: 1 }, { sparse: true });
UserSchema.index({ employeeId: 1 }, { sparse: true });
UserSchema.index({ classId: 1 });
// Unique indexes with schoolId for multi-tenant uniqueness
UserSchema.index({ schoolId: 1, studentId: 1 }, { unique: true, sparse: true });
UserSchema.index({ schoolId: 1, teacherId: 1 }, { unique: true, sparse: true });
UserSchema.index({ schoolId: 1, employeeId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IUser>('User', UserSchema);

