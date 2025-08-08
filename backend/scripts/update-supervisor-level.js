const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

const updateSupervisorLevel = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all supervisors
    const supervisors = await User.find({ 
      role: 'supervisor',
      isActive: true 
    });
    
    console.log(`Found ${supervisors.length} supervisors`);

    // Update supervisor levels
    for (const supervisor of supervisors) {
      if (!supervisor.supervisorLevel) {
        supervisor.supervisorLevel = 1; // Default to level 1
        await supervisor.save();
        console.log(`✅ Updated ${supervisor.name} to supervisor level 1`);
      } else {
        console.log(`ℹ️  ${supervisor.name} already has supervisor level ${supervisor.supervisorLevel}`);
      }
    }

    console.log('🎉 Supervisor level update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update error:', error);
    process.exit(1);
  }
};

updateSupervisorLevel();
