const { connectDB, disconnectDB } = require('../config/database');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Voucher = require('../models/Voucher');
const Setting = require('../models/Setting');
const User = require('../models/User');

const migrations = [
  {
    Model: Brand,
    drop: ['name_1', 'slug_1'],
    create: ['brand_name_active_unique', 'brand_slug_active_unique'],
  },
  {
    Model: Category,
    drop: ['name_1', 'slug_1'],
    create: ['category_name_active_unique', 'category_slug_active_unique'],
  },
  { Model: Voucher, drop: ['code_1'], create: ['voucher_code_active_unique'] },
  { Model: Setting, drop: ['key_1'], create: ['setting_key_active_unique'] },
  {
    Model: User,
    drop: ['phone_1', 'email_optional_unique'],
    create: ['user_phone_active_unique', 'user_email_active_unique'],
  },
];

const migrationPlan = migrations.map(({ Model, drop, create }) => ({
  model: Model.modelName,
  drop,
  create,
}));

const migrateSoftDeleteIndexes = async ({ write = false, log = console.log } = {}) => {
  log(JSON.stringify({ mode: write ? 'write' : 'dry-run', migrations: migrationPlan }, null, 2));
  if (!write) {
    log('Dry run only. Re-run with --write after reviewing this plan.');
    return migrationPlan;
  }

  for (const { Model, drop } of migrations) {
    const existing = new Set((await Model.collection.indexes()).map((index) => index.name));
    for (const name of drop) {
      if (existing.has(name)) await Model.collection.dropIndex(name);
    }
    await Model.syncIndexes();
  }

  log('Soft-delete index migration completed.');
  return migrationPlan;
};

const run = async ({ write = process.argv.includes('--write') } = {}) => {
  await connectDB();
  try {
    return await migrateSoftDeleteIndexes({ write });
  } finally {
    await disconnectDB();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { migrateSoftDeleteIndexes, migrationPlan, migrations, run };
