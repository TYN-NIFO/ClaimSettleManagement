const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

const checkClaims = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all claims
    const allClaims = await Claim.find({}).populate('employeeId', 'name email role');
    console.log(`📊 Total claims in database: ${allClaims.length}`);

    if (allClaims.length > 0) {
      console.log('\n📋 Claims details:');
      allClaims.forEach((claim, index) => {
        console.log(`${index + 1}. ID: ${claim._id}`);
        console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.role})`);
        console.log(`   Category: ${claim.category}`);
        console.log(`   Amount: $${claim.amount}`);
        console.log(`   Status: ${claim.status}`);
        console.log(`   Created: ${claim.createdAt}`);
        console.log('---');
      });
    }

    // Get all users
    const allUsers = await User.find({}).select('name email role');
    console.log(`\n👥 Total users in database: ${allUsers.length}`);
    
    console.log('\n📋 Users by role:');
    const usersByRole = {};
    allUsers.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });

    Object.entries(usersByRole).forEach(([role, users]) => {
      console.log(`${role}: ${users.length} users`);
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
      });
    });

    console.log('\n🎉 Claims check completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Check error:', error);
    process.exit(1);
  }
};

checkClaims();
