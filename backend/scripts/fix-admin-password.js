const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

const fixAdminPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }

    console.log('👑 Found admin user:');
    console.log(`- Name: ${adminUser.name}`);
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Has password hash: ${!!adminUser.passwordHash}`);

    // Hash the password properly
    const passwordHash = bcrypt.hashSync('admin123', 12);
    
    // Update the admin user with the proper password hash
    await User.findByIdAndUpdate(adminUser._id, { passwordHash });
    
    console.log('✅ Password hash updated successfully');
    
    // Test the password
    const updatedAdmin = await User.findById(adminUser._id);
    const isValid = updatedAdmin.checkPassword('admin123');
    console.log(`🔐 Password test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixAdminPassword();
