import mongoose from 'mongoose';
import Policy from '../models/Policy.js';
import dotenv from 'dotenv';

dotenv.config();

const correctCategories = [
  'Travel & Lodging',
  'Client Entertainment & Business Meals',
  'Employee Welfare & HR',
  'Training & Development',
  'Marketing & Business Development',
  'Subscriptions & Memberships',
  'Office & Admin',
  'IT & Software',
  'Project / Client-Billable Expenses',
  'Finance, Legal & Compliance',
  'Advances & Reconciliations'
];

async function updatePolicyCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the current policy
    const policy = await Policy.findOne().sort({ createdAt: -1 });
    
    if (policy) {
      console.log('Found existing policy:', {
        id: policy._id,
        currentCategories: policy.claimCategories
      });
      
      // Update the policy with correct categories
      policy.claimCategories = correctCategories;
      await policy.save();
      
      console.log('Policy updated successfully with categories:', correctCategories);
    } else {
      console.log('No existing policy found, creating new one...');
      
      const newPolicy = new Policy({
        approvalMode: 'both',
        claimCategories: correctCategories,
        maxAmountBeforeFinanceManager: 10000,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSizeMB: 10,
        payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
        autoAssignSupervisors: false,
        claimRetentionDays: 365
      });
      
      await newPolicy.save();
      console.log('New policy created with categories:', correctCategories);
    }
    
    console.log('Policy categories update completed successfully');
  } catch (error) {
    console.error('Error updating policy categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updatePolicyCategories();
