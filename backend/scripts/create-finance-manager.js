const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

const createFinanceManager = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if finance manager exists
    const existingFinanceManager = await User.findOne({ 
      role: 'finance_manager',
      email: 'finance@company.com'
    });
    
    if (existingFinanceManager) {
      console.log('⚠️  Finance manager already exists');
      return;
    }

    // Create finance manager
    const financeManager = new User({
      name: 'Finance Manager',
      email: 'finance@company.com',
      password: 'finance123',
      role: 'finance_manager',
      department: 'Finance',
      createdBy: '000000000000000000000000' // System created
    });
    
    await financeManager.save();
    console.log('✅ Created finance manager');
    console.log('Email: finance@company.com');
    console.log('Password: finance123');

    console.log('🎉 Finance manager creation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Creation error:', error);
    process.exit(1);
  }
};

createFinanceManager();
