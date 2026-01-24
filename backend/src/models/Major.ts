import mongoose, { Schema, Document } from 'mongoose';

export interface IMajor extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  name: string; // e.g., "Science", "Social Studies", "Language"
  code: string; // e.g., "SCI", "SOC", "LANG"
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MajorSchema = new Schema<IMajor>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes - unique code per school
MajorSchema.index({ schoolId: 1, code: 1 }, { unique: true });
MajorSchema.index({ schoolId: 1, isActive: 1 });

export default mongoose.model<IMajor>('Major', MajorSchema);

