// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    // Optionally start an in-memory MongoDB for local testing
    if (process.env.USE_MEMORY_DB === 'true' || !mongoUri) {
      // Lazy-require to avoid adding heavy deps unless needed
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const memServer = await MongoMemoryServer.create();
      mongoUri = memServer.getUri();
      console.log('Using in-memory MongoDB for testing');
    }

    await mongoose.connect(mongoUri, {
      // mongoose v6+ ignores these, but keep for compatibility warnings
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected ✅');
  } catch (err) {
    console.error('MongoDB connection error ❌:', err.message);
    // Don't exit in testing mode; rethrow so caller can decide
    if (process.env.USE_MEMORY_DB === 'true') {
      throw err;
    }
    process.exit(1);
  }
};

module.exports = connectDB;
