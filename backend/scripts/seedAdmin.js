require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    console.log('🌱 Starting SecureAuth Admin & Demo User Seeder...');
    await connectDB();

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@secureauth.io').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Secure2026!';
    const adminName = process.env.ADMIN_NAME || 'Security Administrator';

    // 1. Seed or Update Admin
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`ℹ️  Admin account (${adminEmail}) already exists. Ensuring role is "admin"...`);
      admin.role = 'admin';
      admin.name = adminName;
      admin.password = adminPassword; // Pre-save will hash
      await admin.save();
      console.log(`✅ Admin account updated successfully.`);
    } else {
      admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        avatar: 'shield-cyan',
        lastLogin: new Date(),
      });
      await admin.save();
      await admin.logActivity('Admin Account Initialized (Seed)');
      console.log(`✨ Successfully created initial Administrator account:`);
      console.log(`   Email:    ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role:     admin`);
    }

    // 2. Seed a Demo Standard User for instant evaluation
    const demoEmail = 'alex.chen@secureauth.io';
    const demoPassword = 'User@Secure2026!';
    let demoUser = await User.findOne({ email: demoEmail });

    if (!demoUser) {
      demoUser = new User({
        name: 'Alex Chen',
        email: demoEmail,
        password: demoPassword,
        role: 'user',
        avatar: 'shield-emerald',
        lastLogin: new Date(),
      });
      await demoUser.save();
      await demoUser.logActivity('Demo User Initialized (Seed)');
      console.log(`✨ Created standard Demo User for testing:`);
      console.log(`   Email:    ${demoEmail}`);
      console.log(`   Password: ${demoPassword}`);
      console.log(`   Role:     user`);
    }

    // 3. Seed a few sample users to give the Admin dashboard realistic data
    const sampleUsers = [
      { name: 'Sarah Connor', email: 's.connor@cyberdyne.org', password: 'Password@2026!', role: 'user', avatar: 'shield-indigo' },
      { name: 'Marcus Wright', email: 'm.wright@resistance.net', password: 'Password@2026!', role: 'user', avatar: 'shield-amber' },
      { name: 'Elena Rostova', email: 'elena.rostova@infosec.io', password: 'Password@2026!', role: 'user', avatar: 'shield-rose' },
    ];

    for (const sample of sampleUsers) {
      const exists = await User.findOne({ email: sample.email });
      if (!exists) {
        const u = new User(sample);
        await u.save();
        await u.logActivity('Sample User Created');
      }
    }
    console.log('✅ Sample users created for Admin table and analytics.');

    console.log('\n🔒 Seeding completed successfully. Ready for evaluation!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedAdmin();
