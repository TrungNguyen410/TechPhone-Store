const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const categorySchema = new mongoose.Schema(
  {
    _id: stringId,
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

categorySchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Category', categorySchema);
