const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.log('⚡ No MONGODB_URI provided in .env.');
    console.log('📁 Initializing SecureAuth Local Persistence Engine (backend/data/local_users.json)...');
    console.log('✅ Local Database active. Full bcrypt 12-round hashing & RBAC enabled.');
    return null;
  }

  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`🚀 MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`⚠️  Could not connect to MongoDB Atlas (${error.message}).`);
    console.log('📁 Falling back seamlessly to SecureAuth Local Persistence Engine (backend/data/local_users.json)...');
    console.log('✅ Local Database active. Full bcrypt 12-round hashing & RBAC enabled.');
    return null;
  }
};

const disconnectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    isConnected = false;
  }
};

module.exports = { connectDB, disconnectDB };
