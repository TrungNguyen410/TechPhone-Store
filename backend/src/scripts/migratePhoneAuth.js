const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');
const { normalizeVietnamesePhone } = require('../utils/phone');

const writeMode = process.argv.includes('--write');

const run = async () => {
  await connectDB();
  const users = await User.find({ isDeleted: { $ne: true } }).select('_id phone phoneVerified phoneVerifiedAt').lean();
  const invalid = [];
  const owners = new Map();
  const duplicates = [];
  const updates = [];

  for (const user of users) {
    const phone = normalizeVietnamesePhone(user.phone);
    if (!phone) {
      invalid.push({ id: user._id, phone: user.phone });
      continue;
    }
    const owner = owners.get(phone);
    if (owner) duplicates.push({ phone, ids: [owner, user._id] });
    else owners.set(phone, user._id);

    const update = {};
    if (phone !== user.phone) update.phone = phone;
    if (user.phoneVerified !== true) update.phoneVerified = true;
    if (!user.phoneVerifiedAt) update.phoneVerifiedAt = new Date();
    if (Object.keys(update).length) updates.push({
      updateOne: { filter: { _id: user._id }, update: { $set: update } },
    });
  }

  console.log(JSON.stringify({ users: users.length, updates: updates.length, invalid, duplicates }, null, 2));
  if (invalid.length || duplicates.length) {
    throw new Error('Migration stopped: resolve invalid or duplicate normalized phone numbers first.');
  }
  if (!writeMode) {
    console.log('Dry run only. Re-run with --write after reviewing this report.');
    return;
  }

  if (updates.length) await User.bulkWrite(updates, { ordered: true });
  const indexes = await User.collection.indexes();
  const legacyEmailIndex = indexes.find((index) => index.name === 'email_1');
  if (legacyEmailIndex) await User.collection.dropIndex(legacyEmailIndex.name);
  await User.collection.createIndex(
    { email: 1 },
    { name: 'email_optional_unique', unique: true, partialFilterExpression: { email: { $type: 'string' } } },
  );
  console.log(`Phone auth migration completed for ${users.length} users.`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
