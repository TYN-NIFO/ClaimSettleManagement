const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

const checkUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check all users
    const users = await User.find({});
    console.log('📋 All users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role} - Active: ${user.isActive}`);
    });

    // Check specifically for admin
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log('\n👑 Admin user found:');
      console.log(`- Name: ${adminUser.name}`);
      console.log(`- Email: ${adminUser.email}`);
      console.log(`- Role: ${adminUser.role}`);
      console.log(`- Active: ${adminUser.isActive}`);
      console.log(`- Has password hash: ${!!adminUser.passwordHash}`);
    } else {
      console.log('\n❌ No admin user found');
    }

    // Test password check
    if (adminUser) {
      const testPassword = 'admin123';
      const isValid = adminUser.checkPassword(testPassword);
      console.log(`\n🔐 Password test for '${testPassword}': ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUsers();
