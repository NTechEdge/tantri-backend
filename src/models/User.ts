import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema>;

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
