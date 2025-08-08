import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Email: ${existingAdmin.email}`);
      return;
    }

    // Create admin user using save to trigger password hashing
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
      department: 'IT',
      createdBy: null
    });

    await adminUser.save();
    
    // Update to self-reference
    await User.findByIdAndUpdate(adminUser._id, { createdBy: adminUser._id });
    
    // Reload the user
    const updatedAdmin = await User.findById(adminUser._id);

    console.log('✅ Admin user created successfully');
    console.log(`- Name: ${updatedAdmin.name}`);
    console.log(`- Email: ${updatedAdmin.email}`);
    console.log(`- Role: ${updatedAdmin.role}`);

    // Test password
    const isValid = updatedAdmin.checkPassword('admin123');
    console.log(`🔐 Password test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();
