const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const brandSchema = new mongoose.Schema(
  {
    _id: stringId,
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    logo: { type: String, default: '' },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

brandSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Brand', brandSchema);
