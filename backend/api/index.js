const app = require('../src/app');
const { connectDB } = require('../src/config/database');

let connectionPromise;

const ensureDatabaseConnection = () => {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
};

module.exports = async (req, res) => {
  await ensureDatabaseConnection();
  return app(req, res);
};