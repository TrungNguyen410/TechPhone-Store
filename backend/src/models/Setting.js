const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');
const { baseSchemaOptions, stringId } = require('./baseSchemaOptions');

const settingSchema = new mongoose.Schema(
  {
    _id: stringId,
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    group: { type: String, default: 'general', index: true },
    label: { type: String, default: '' },
  },
  baseSchemaOptions,
);

settingSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Setting', settingSchema);
