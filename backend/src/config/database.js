const mongoose = require('mongoose');
const env = require('./env');

const assertTransactionTopology = (hello) => {
  if (!hello?.setName && hello?.msg !== 'isdbgrid') {
    throw new Error(
      'MongoDB replica set or sharded cluster is required for atomic checkout transactions.',
    );
  }
};

const connectDB = async (uri = env.mongoUri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assertTransactionTopology(hello);
  return mongoose.connection;
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { assertTransactionTopology, connectDB, disconnectDB };
