import mongoose, { Document, Schema } from 'mongoose';

export interface ICashAppPayment extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  cashAppName: string;
  status: 'pending' | 'verified' | 'rejected';
  adminNotes?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CashAppPaymentSchema = new Schema<ICashAppPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, default: 100 },
    cashAppName: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

CashAppPaymentSchema.index({ status: 1, createdAt: -1 });

export const CashAppPayment =
  mongoose.models.CashAppPayment ||
  mongoose.model<ICashAppPayment>('CashAppPayment', CashAppPaymentSchema);
