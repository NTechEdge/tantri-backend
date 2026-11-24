import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    nameBn: { type: String, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, default: '' },
    descriptionBn: { type: String, default: '' },
    price: { type: Number, required: true },
    salePrice: { type: Number, default: null },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: '' },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    material: { type: String, default: '' },
    origin: { type: String, default: 'Made in Bangladesh' },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type IProduct = InferSchemaType<typeof productSchema>;

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
