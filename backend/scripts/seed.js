const mongoose = require('mongoose');
const User = require('../models/User');
const Policy = require('../models/Policy');
require('dotenv').config({ path: './config.env' });

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
    } else {
      // Create default admin user with temporary schema modification
      const tempUserSchema = User.schema.clone();
      tempUserSchema.path('createdBy').required(false);
      const TempUser = mongoose.model('TempUser', tempUserSchema);
      
      const adminUser = new TempUser({
        name: 'System Administrator',
        email: 'admin@company.com',
        password: 'admin123', // Will be hashed by virtual
        role: 'admin',
        department: 'IT'
      });
      await adminUser.save();
      
      // Update the admin user to reference itself using the original model
      await User.findByIdAndUpdate(adminUser._id, { createdBy: adminUser._id });
      
      console.log('✅ Created default admin user');
    }

    // Check if policy exists
    const existingPolicy = await Policy.findOne();
    if (existingPolicy) {
      console.log('⚠️  Policy already exists');
    } else {
      // Create default policy
      const defaultPolicy = new Policy({
        approvalMode: 'both',
        claimCategories: ['Travel', 'Healthcare', 'Office', 'Training', 'Other'],
        maxAmountBeforeFinanceManager: 10000,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        maxFileSizeMB: 10,
        payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
        autoAssignSupervisors: false,
        claimRetentionDays: 365,
        updatedBy: adminUser._id
      });
      await defaultPolicy.save();
      console.log('✅ Created default policy');
    }

    console.log('🎉 Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
