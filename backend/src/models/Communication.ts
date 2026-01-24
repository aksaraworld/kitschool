import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunication extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  parentMessageId?: mongoose.Types.ObjectId; // For reply threads
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationSchema = new Schema<ICommunication>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  from: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  parentMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Communication',
    sparse: true
  },
  attachments: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes - school-scoped
CommunicationSchema.index({ schoolId: 1, from: 1, createdAt: -1 });
CommunicationSchema.index({ schoolId: 1, to: 1, isRead: 1, createdAt: -1 });
CommunicationSchema.index({ schoolId: 1, parentMessageId: 1 });
CommunicationSchema.index({ schoolId: 1 });

export default mongoose.model<ICommunication>('Communication', CommunicationSchema);

