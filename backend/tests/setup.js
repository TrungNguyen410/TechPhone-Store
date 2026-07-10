const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const clearDatabase = async () => {
  const collections = await mongoose.connection.db?.collections();
  if (!collections) return;
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  const testMongoUri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/techphone_store_test';

  try {
    await mongoose.connect(testMongoUri, { serverSelectionTimeoutMS: 3000 });
  } catch {
    await mongoose.disconnect().catch(() => {});
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }

  await clearDatabase();
});

afterEach(clearDatabase);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});
