import mongoose, { Schema, Document } from 'mongoose';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export interface IInvoice extends Document {
  schoolId: mongoose.Types.ObjectId; // Multi-tenancy
  invoiceNumber: string;
  studentId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId;
  amount: number;
  dueDate: Date;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  description?: string;
  items: {
    description: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  month?: number;
  year?: number;
  createdBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  schoolId: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  invoiceNumber: {
    type: String,
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
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.PENDING,
    required: true
  },
  description: {
    type: String
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  month: {
    type: Number,
    min: 1,
    max: 12
  },
  year: {
    type: Number
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes - school-scoped
InvoiceSchema.index({ schoolId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ schoolId: 1, studentId: 1, status: 1 });
InvoiceSchema.index({ schoolId: 1, parentId: 1, status: 1 });
InvoiceSchema.index({ schoolId: 1, dueDate: 1 });
InvoiceSchema.index({ schoolId: 1, status: 1 });
InvoiceSchema.index({ schoolId: 1, month: 1, year: 1 });

// Auto-generate invoice number
InvoiceSchema.pre('save', async function(next) {
  if (!this.isNew && !this.isModified('invoiceNumber')) {
    // Calculate remaining amount
    this.remainingAmount = this.amount - (this.paidAmount || 0);
    // Update status based on paid amount
    if (this.remainingAmount <= 0 && this.status !== InvoiceStatus.CANCELLED) {
      this.status = InvoiceStatus.PAID;
    } else if (this.paidAmount > 0 && this.remainingAmount > 0) {
      this.status = InvoiceStatus.PARTIAL;
    }
    return next();
  }
  
  if (!this.invoiceNumber) {
    try {
      const count = await mongoose.model('Invoice').countDocuments({ schoolId: this.schoolId });
      const year = new Date().getFullYear();
      this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      return next(error as Error);
    }
  }
  // Calculate remaining amount
  this.remainingAmount = this.amount - (this.paidAmount || 0);
  // Update status based on paid amount
  if (this.remainingAmount <= 0) {
    this.status = InvoiceStatus.PAID;
  } else if (this.paidAmount > 0) {
    this.status = InvoiceStatus.PARTIAL;
  }
  next();
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);

