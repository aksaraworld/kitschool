import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  name: string; // e.g., "10A", "11B"
  yearId: mongoose.Types.ObjectId;
  majorId: mongoose.Types.ObjectId;
  homeroomTeacherId: mongoose.Types.ObjectId;
  studentIds: mongoose.Types.ObjectId[];
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  yearId: {
    type: Schema.Types.ObjectId,
    ref: 'Year',
    required: true
  },
  majorId: {
    type: Schema.Types.ObjectId,
    ref: 'Major',
    required: true
  },
  homeroomTeacherId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  capacity: {
    type: Number,
    default: 40
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes - unique class name within school, year and major
ClassSchema.index({ schoolId: 1, name: 1, yearId: 1, majorId: 1 }, { unique: true });
ClassSchema.index({ schoolId: 1, isActive: 1 });
ClassSchema.index({ schoolId: 1, yearId: 1 });

export default mongoose.model<IClass>('Class', ClassSchema);

