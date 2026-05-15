import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    drop: { type: String, required: true, trim: true, index: true },
    dropLabel: { type: String, required: true, trim: true },
    incarnation: {
      type: String,
      required: true,
      enum: ['observer', 'don', 'athlete', 'machine', 'wanderer', 'geometric', 'witness'],
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['outerwear', 'tops', 'bottoms', 'accessories'],
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['available', 'limited', 'soldout'], index: true },
    stock: { type: Number, required: true, min: 0 },
    totalStock: { type: Number, required: true, min: 0 },
    sizes: [{ type: String, required: true }],
    images: {
      primary: { type: String, required: true },
      hover: { type: String, default: '' },
      gallery: [{ type: String }],
    },
    specs: {
      material: { type: String, default: '' },
      weight: { type: String, default: '' },
      fit: { type: String, default: '' },
      care: { type: String, default: '' },
    },
    description: { type: String, required: true },
    liveObservers: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret._id = ret._id.toString();
        return ret;
      },
    },
  },
);

export const Product = mongoose.model('Product', productSchema);
