import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  classId?: mongoose.Types.ObjectId; // For class-specific schedules
  createdBy: mongoose.Types.ObjectId;
  type: 'class' | 'school' | 'exam' | 'holiday' | 'event';
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  isAllDay: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  startTime: {
    type: String
  },
  endTime: {
    type: String
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
  type: {
    type: String,
    enum: ['class', 'school', 'exam', 'holiday', 'event'],
    default: 'class'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: {
      type: Number,
      default: 1
    },
    endDate: {
      type: Date
    }
  },
  isAllDay: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes - school-scoped
ScheduleSchema.index({ schoolId: 1, classId: 1, startDate: 1 });
ScheduleSchema.index({ schoolId: 1, startDate: 1, endDate: 1 });
ScheduleSchema.index({ schoolId: 1, type: 1 });
ScheduleSchema.index({ schoolId: 1 });

export default mongoose.model<ISchedule>('Schedule', ScheduleSchema);

