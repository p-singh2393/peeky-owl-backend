import mongoose from 'mongoose';

const labAccessSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  },
  { timestamps: true, versionKey: false },
);

export const LabAccess = mongoose.model('LabAccess', labAccessSchema);
