import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone:    { type: String, default: '' },
    line1:    { type: String, required: true },
    line2:    { type: String, default: '' },
    city:     { type: String, required: true },
    state:    { type: String, default: '' },
    country:  { type: String, required: true },
    postcode: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestEmail:      { type: String, trim: true, lowercase: true },
    items:           { type: [cartItemSchema], required: true },
    total:           { type: Number, required: true, min: 0 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    status: {
      type:    String,
      enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index:   true,
    },
    paymentMethod: { type: String, enum: ['razorpay', 'cod'], default: 'cod' },
    paymentId:     { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

export const Order = mongoose.model('Order', orderSchema);
