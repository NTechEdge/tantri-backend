import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    variant: { type: String, default: '' },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    district: { type: String, required: true },
    note: { type: String, default: '' },
    paymentMethod: { type: String, required: true },
    paymentRef: { type: String, default: '' },
    paymentSender: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed'], default: 'unpaid' },
    lang: { type: String, enum: ['bn', 'en'], default: 'bn' },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    items: { type: [orderItemSchema], default: [] },
  },
  { timestamps: true }
);

export type IOrder = InferSchemaType<typeof orderSchema>;

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
