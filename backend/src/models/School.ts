import mongoose, { Schema, Document } from 'mongoose';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface ISchool extends Document {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  taxId?: string;
  accreditation?: string;
  establishedYear?: number;
  description?: string;
  // SaaS subscription fields
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trialEndDate?: Date;
  maxUsers?: number; // Maximum number of users allowed
  maxStudents?: number; // Maximum number of students allowed
  // Subscription fee per student (can be overridden per school, defaults to platform config)
  subscriptionFeePerStudent?: number; // Override platform default, null = use platform default
  // Settlement/Payment fields
  settlementAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  billingEmail?: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  paymentMethod?: string;
  // System fields
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId; // SaaS admin who created this school
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  province: {
    type: String,
    required: true
  },
  postalCode: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  logo: {
    type: String
  },
  principalName: {
    type: String
  },
  principalEmail: {
    type: String
  },
  principalPhone: {
    type: String
  },
  bankAccount: {
    bankName: {
      type: String
    },
    accountNumber: {
      type: String
    },
    accountHolder: {
      type: String
    }
  },
  taxId: {
    type: String
  },
  accreditation: {
    type: String
  },
  establishedYear: {
    type: Number
  },
  description: {
    type: String
  },
  // SaaS subscription fields
  subscriptionStatus: {
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.TRIAL,
    required: true
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  trialEndDate: {
    type: Date
  },
  maxUsers: {
    type: Number,
    default: 100
  },
  maxStudents: {
    type: Number,
    default: 500
  },
  // Subscription fee per student (override platform default, null = use platform default)
  subscriptionFeePerStudent: {
    type: Number,
    default: null, // null means use platform default
    min: 0
  },
  // Settlement/Payment fields
  settlementAccount: {
    bankName: {
      type: String
    },
    accountNumber: {
      type: String
    },
    accountHolder: {
      type: String
    }
  },
  billingEmail: {
    type: String
  },
  lastPaymentDate: {
    type: Date
  },
  nextPaymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String
  },
  // System fields
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
SchoolSchema.index({ email: 1 }, { unique: true });
SchoolSchema.index({ isActive: 1 });
SchoolSchema.index({ subscriptionStatus: 1 });
SchoolSchema.index({ subscriptionEndDate: 1 });

export default mongoose.model<ISchool>('School', SchoolSchema);

