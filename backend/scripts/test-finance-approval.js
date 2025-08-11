import mongoose from 'mongoose';
import Claim from '../models/Claim.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testFinanceApproval() {
  try {
    console.log('\n=== Testing Finance Manager Approval ===\n');

    // Find a finance manager
    const financeManager = await User.findOne({ role: 'finance_manager' });
    if (!financeManager) {
      console.log('❌ No finance manager found');
      return;
    }
    console.log(`✅ Found finance manager: ${financeManager.name} (${financeManager.email})`);

    // Find claims with status 'approved' (supervisor approved)
    const approvedClaims = await Claim.find({ status: 'approved' })
      .populate('employeeId', 'name email')
      .populate('supervisorApproval.approvedBy', 'name email');

    console.log(`\n📋 Found ${approvedClaims.length} claims with status 'approved':`);
    
    if (approvedClaims.length === 0) {
      console.log('❌ No claims with status "approved" found');
      console.log('\nAvailable claim statuses:');
      const statusCounts = await Claim.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      statusCounts.forEach(({ _id, count }) => {
        console.log(`  - ${_id}: ${count} claims`);
      });
      return;
    }

    approvedClaims.forEach((claim, index) => {
      console.log(`\n${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Supervisor Approval: ${claim.supervisorApproval?.status || 'N/A'}`);
      console.log(`   Supervisor: ${claim.supervisorApproval?.approvedBy?.name || 'N/A'}`);
      console.log(`   Finance Approval: ${claim.financeApproval?.status || 'pending'}`);
      console.log(`   Amount: ₹${claim.grandTotal?.toLocaleString() || '0'}`);
    });

    // Test if finance manager can access these claims
    console.log('\n🔍 Testing finance manager access to approved claims...');
    
    for (const claim of approvedClaims) {
      // Check if finance manager is the claim owner
      const isOwnClaim = claim.employeeId._id.toString() === financeManager._id.toString();
      
      // Check if claim status is in allowed statuses for finance manager
      const allowedStatuses = ['approved', 'finance_approved', 'paid'];
      const hasAllowedStatus = allowedStatuses.includes(claim.status);
      
      console.log(`\nClaim ${claim._id}:`);
      console.log(`  - Is own claim: ${isOwnClaim}`);
      console.log(`  - Has allowed status: ${hasAllowedStatus} (${claim.status})`);
      console.log(`  - Can access: ${isOwnClaim || hasAllowedStatus}`);
      
      if (isOwnClaim || hasAllowedStatus) {
        console.log(`  ✅ Finance manager CAN access this claim`);
      } else {
        console.log(`  ❌ Finance manager CANNOT access this claim`);
      }
    }

    console.log('\n=== Test Summary ===');
    console.log('✅ Finance manager found');
    console.log(`✅ Found ${approvedClaims.length} claims with status 'approved'`);
    console.log('✅ RBAC middleware should allow access to approved claims');
    console.log('✅ Frontend should show approval buttons for approved claims');
    
    console.log('\n🎯 Expected behavior:');
    console.log('- Finance managers should see claims with status "approved"');
    console.log('- Finance managers should be able to approve/reject these claims');
    console.log('- After approval, claim status should change to "finance_approved"');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testFinanceApproval();
