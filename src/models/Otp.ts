import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type IOtp = InferSchemaType<typeof otpSchema>;

export const Otp: Model<IOtp> =
  mongoose.models.Otp || mongoose.model<IOtp>('Otp', otpSchema);
