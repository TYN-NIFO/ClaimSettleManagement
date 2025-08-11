
import mongoose from 'mongoose';
import Policy from '../models/Policy.js';

const updatePolicy = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/claim-app');
    console.log('Connected to MongoDB');

    // Find the existing policy
    let policy = await Policy.findOne();
    
    if (policy) {
      console.log('Found existing policy, updating categories...');
      console.log('Old categories:', policy.claimCategories);
      
      // Update with new detailed categories
      policy.claimCategories = [
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
      
      policy.allowedFileTypes = ['pdf', 'jpg', 'jpeg', 'png'];
      
      await policy.save();
      console.log('Policy updated successfully!');
      console.log('New categories:', policy.claimCategories);
    } else {
      console.log('No policy found, creating new one...');
      policy = new Policy({
        approvalMode: 'both',
        claimCategories: [
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
        ],
        maxAmountBeforeFinanceManager: 10000,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSizeMB: 10,
        payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
        autoAssignSupervisors: false,
        claimRetentionDays: 365
      });
      
      await policy.save();
      console.log('New policy created successfully!');
      console.log('Categories:', policy.claimCategories);
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error updating policy:', error);
    process.exit(1);
  }
};

updatePolicy();
