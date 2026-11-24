import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export type ISetting = InferSchemaType<typeof settingSchema>;

export const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>('Setting', settingSchema);
