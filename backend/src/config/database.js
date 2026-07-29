const mongoose = require('mongoose');
const env = require('./env');

const assertTransactionTopology = (hello) => {
  if (!hello?.setName && hello?.msg !== 'isdbgrid') {
    throw new Error(
      'MongoDB replica set or sharded cluster is required for atomic checkout transactions.',
    );
  }
};

const connectDB = async (uri = env.mongoUri, client = mongoose) => {
  client.set('strictQuery', true);
  await client.connect(uri);
  try {
    const hello = await client.connection.db.admin().command({ hello: 1 });
    assertTransactionTopology(hello);
    return client.connection;
  } catch (error) {
    await client.disconnect().catch(() => {});
    throw error;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { assertTransactionTopology, connectDB, disconnectDB };
