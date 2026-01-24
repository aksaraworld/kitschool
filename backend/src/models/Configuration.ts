import mongoose, { Schema, Document } from 'mongoose';

export interface IConfiguration extends Document {
  key: string;
  value: any;
  description?: string;
  type: 'number' | 'string' | 'boolean' | 'object';
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigurationSchema = new Schema<IConfiguration>({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['number', 'string', 'boolean', 'object'],
    default: 'string',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  }
}, {
  timestamps: true
});

// Indexes
ConfigurationSchema.index({ key: 1 }, { unique: true });


export default mongoose.model<IConfiguration>('Configuration', ConfigurationSchema);

