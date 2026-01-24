import mongoose, { Schema, Document } from 'mongoose';

export interface IYear extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  name: string; // e.g., "2024/2025"
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const YearSchema = new Schema<IYear>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes - unique name per school
YearSchema.index({ schoolId: 1, name: 1 }, { unique: true });
YearSchema.index({ schoolId: 1, isActive: 1 });

export default mongoose.model<IYear>('Year', YearSchema);

