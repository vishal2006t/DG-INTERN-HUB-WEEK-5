const mongoose = require('mongoose');

// Cached connection across serverless invocations
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const isProduction = isVercel || (process.env.NODE_ENV === 'production' && Boolean(process.env.MONGODB_URI));

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // 1. Production validation - Never allow fallback in production or on Vercel
  if (!uri || uri.trim() === '') {
    if (isProduction || isVercel) {
      const errorMsg = 'MONGODB_URI environment variable is missing in production deployment.';
      console.error(`❌ Database Configuration Error: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    console.log('⚡ No MONGODB_URI provided in .env.');
    console.log('📁 Initializing SecureAuth Local Persistence Engine (backend/data/local_users.json)...');
    console.log('✅ Local Database active. Full bcrypt 12-round hashing & RBAC enabled.');
    return null;
  }

  // 2. Return active connection if ready
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 3. Reuse in-flight connection promise or create a new one
  if (!cached.promise) {
    console.log('📡 Connecting to MongoDB Atlas...');
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000,
      })
      .then((conn) => {
        console.log(`🚀 MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
        cached.conn = conn;
        return conn;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        if (isProduction || isVercel) {
          console.error(`❌ MongoDB Atlas Connection Error: ${err.message}`);
          throw err;
        }
        console.warn(`⚠️  Could not connect to MongoDB Atlas (${err.message}).`);
        console.log('📁 Falling back seamlessly to SecureAuth Local Persistence Engine (backend/data/local_users.json)...');
        console.log('✅ Local Database active. Full bcrypt 12-round hashing & RBAC enabled.');
        return null;
      });
  }

  try {
    const conn = await cached.promise;
    return conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    if (isProduction || isVercel) {
      throw error;
    }
    return null;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
};

module.exports = { connectDB, disconnectDB };

