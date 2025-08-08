import mongoose from 'mongoose';
import Policy from '../models/Policy.js';
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

const testPolicy = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if policy exists
    let policy = await Policy.findOne();
    
    if (!policy) {
      console.log('⚠️  No policy found, creating default policy...');
      
      // Create default policy
      policy = new Policy({
        approvalMode: 'both',
        claimCategories: ['Travel', 'Healthcare', 'Office', 'Training', 'Other'],
        maxAmountBeforeFinanceManager: 10000,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        maxFileSizeMB: 10,
        payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
        autoAssignSupervisors: false,
        claimRetentionDays: 365,
        updatedBy: null // We'll set this later
      });
      await policy.save();
      console.log('✅ Default policy created successfully');
    } else {
      console.log('✅ Policy found:', {
        categories: policy.claimCategories,
        categoriesCount: policy.claimCategories.length
      });
    }

    console.log('🎉 Policy test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Policy test error:', error);
    process.exit(1);
  }
};

testPolicy();
