import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    nameBn: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { timestamps: true }
);

export type ICategory = InferSchemaType<typeof categorySchema>;

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', categorySchema);
