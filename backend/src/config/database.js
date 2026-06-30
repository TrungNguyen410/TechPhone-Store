const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async (uri = env.mongoUri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
