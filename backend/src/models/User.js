const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const userSchema = new mongoose.Schema(
  {
    _id: stringId,
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    status: { type: String, enum: ['active', 'locked', 'inactive'], default: 'active', index: true },
    address: { type: String, default: '' },
    avatar: { type: String, default: '' },
    wishlist: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: true, index: true },
    emailVerifiedAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

userSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('User', userSchema);
