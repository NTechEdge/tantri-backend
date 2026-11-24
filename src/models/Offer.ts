import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const offerSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, default: '' },
    titleBn: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    used: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    showBanner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type IOffer = InferSchemaType<typeof offerSchema>;

export const Offer: Model<IOffer> =
  mongoose.models.Offer || mongoose.model<IOffer>('Offer', offerSchema);
