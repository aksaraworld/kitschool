import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentActivity extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  studentId: mongoose.Types.ObjectId;
  type: 'attendance' | 'assignment' | 'exam' | 'behavior' | 'achievement' | 'other';
  title: string;
  description?: string;
  date: Date;
  classId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const StudentActivitySchema = new Schema<IStudentActivity>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['attendance', 'assignment', 'exam', 'behavior', 'achievement', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    sparse: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes - school-scoped
StudentActivitySchema.index({ schoolId: 1, studentId: 1, date: -1 });
StudentActivitySchema.index({ schoolId: 1, classId: 1, date: -1 });
StudentActivitySchema.index({ schoolId: 1, type: 1 });
StudentActivitySchema.index({ schoolId: 1 });

export default mongoose.model<IStudentActivity>('StudentActivity', StudentActivitySchema);

