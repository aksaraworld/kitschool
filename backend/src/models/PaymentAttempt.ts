import mongoose, { Schema, Document } from 'mongoose';

export enum PaymentAttemptStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  E_WALLET = 'e_wallet',
  CASH = 'cash',
  OTHER = 'other'
}

export interface IPaymentAttempt extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  invoiceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentAttemptStatus;
  transactionId?: string;
  paymentReference?: string;
  receiptUrl?: string;
  proofOfPayment?: string;
  notes?: string;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentAttemptSchema = new Schema<IPaymentAttempt>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
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
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(PaymentAttemptStatus),
    default: PaymentAttemptStatus.PENDING,
    required: true
  },
  transactionId: {
    type: String
  },
  paymentReference: {
    type: String
  },
  receiptUrl: {
    type: String
  },
  proofOfPayment: {
    type: String
  },
  notes: {
    type: String
  },
  errorMessage: {
    type: String
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes - school-scoped
PaymentAttemptSchema.index({ schoolId: 1, invoiceId: 1 });
PaymentAttemptSchema.index({ schoolId: 1, studentId: 1 });
PaymentAttemptSchema.index({ schoolId: 1, parentId: 1 });
PaymentAttemptSchema.index({ schoolId: 1, status: 1 });
PaymentAttemptSchema.index({ schoolId: 1, transactionId: 1 }, { sparse: true });

export default mongoose.model<IPaymentAttempt>('PaymentAttempt', PaymentAttemptSchema);

