import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface IPayment extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  studentId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  month: number; // 1-12
  year: number;
  description?: string;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
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
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  paymentMethod: {
    type: String
  },
  transactionId: {
    type: String
  },
  receiptUrl: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes - school-scoped
PaymentSchema.index({ schoolId: 1, studentId: 1, month: 1, year: 1 }, { unique: true });
PaymentSchema.index({ schoolId: 1, parentId: 1 });
PaymentSchema.index({ schoolId: 1, status: 1 });
PaymentSchema.index({ schoolId: 1, dueDate: 1 });
PaymentSchema.index({ schoolId: 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);

