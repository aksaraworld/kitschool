import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionFee extends Document {
  schoolId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  transactionAmount: number; // Total transaction amount
  adminFee: number; // Admin fee (percentage of transactionAmount)
  adminFeeAmount: number; // Calculated admin fee amount
  feeBreakdown: {
    paymentGateway: number; // 3% of adminFeeAmount
    platform: number; // 4% of adminFeeAmount
    tax: number; // 3% of adminFeeAmount
  };
  netAmount: number; // transactionAmount - adminFeeAmount (amount school receives)
  status: 'pending' | 'calculated' | 'settled';
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionFeeSchema = new Schema<ITransactionFee>({
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
  transactionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  adminFee: {
    type: Number,
    required: true,
    min: 0,
    max: 100 // Percentage
  },
  adminFeeAmount: {
    type: Number,
    required: true,
    min: 0
  },
  feeBreakdown: {
    paymentGateway: {
      type: Number,
      required: true,
      min: 0
    },
    platform: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    }
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'calculated', 'settled'],
    default: 'calculated',
    required: true
  },
  settledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
TransactionFeeSchema.index({ schoolId: 1, status: 1 });
TransactionFeeSchema.index({ invoiceId: 1 }, { unique: true });
TransactionFeeSchema.index({ schoolId: 1, createdAt: -1 });

export default mongoose.model<ITransactionFee>('TransactionFee', TransactionFeeSchema);


