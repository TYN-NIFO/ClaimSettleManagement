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

async function createTestApprovalScenario() {
  try {
    console.log('\n=== Creating Test Approval Scenario ===\n');

    // Find users
    const supervisor = await User.findOne({ role: 'supervisor' });
    const financeManager = await User.findOne({ role: 'finance_manager' });
    const employee = await User.findOne({ role: 'employee' });

    if (!supervisor || !financeManager || !employee) {
      console.log('❌ Missing required users:');
      console.log(`  - Supervisor: ${supervisor ? 'Found' : 'Missing'}`);
      console.log(`  - Finance Manager: ${financeManager ? 'Found' : 'Missing'}`);
      console.log(`  - Employee: ${employee ? 'Found' : 'Missing'}`);
      return;
    }

    console.log('✅ Found all required users:');
    console.log(`  - Supervisor: ${supervisor.name} (${supervisor.email})`);
    console.log(`  - Finance Manager: ${financeManager.name} (${financeManager.email})`);
    console.log(`  - Employee: ${employee.name} (${employee.email})`);

    // Find a submitted claim that we can approve
    const submittedClaim = await Claim.findOne({ status: 'submitted' })
      .populate('employeeId', 'name email');

    if (!submittedClaim) {
      console.log('❌ No submitted claims found to test with');
      console.log('\nAvailable claim statuses:');
      const statusCounts = await Claim.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      statusCounts.forEach(({ _id, count }) => {
        console.log(`  - ${_id}: ${count} claims`);
      });
      return;
    }

    console.log(`\n📋 Found submitted claim to test with:`);
    console.log(`  - Claim ID: ${submittedClaim._id}`);
    console.log(`  - Employee: ${submittedClaim.employeeId?.name} (${submittedClaim.employeeId?.email})`);
    console.log(`  - Status: ${submittedClaim.status}`);
    console.log(`  - Amount: ₹${submittedClaim.grandTotal?.toLocaleString() || '0'}`);

    // Simulate supervisor approval
    console.log('\n🔧 Simulating supervisor approval...');
    
    submittedClaim.status = 'approved';
    submittedClaim.supervisorApproval = {
      status: 'approved',
      approvedBy: supervisor._id,
      approvedAt: new Date(),
      notes: 'Test approval by supervisor'
    };

    await submittedClaim.save();

    console.log('✅ Claim approved by supervisor');
    console.log(`  - New status: ${submittedClaim.status}`);
    console.log(`  - Supervisor: ${supervisor.name}`);

    // Now test if finance manager can access this claim
    console.log('\n🔍 Testing finance manager access to approved claim...');
    
    const allowedStatuses = ['approved', 'finance_approved', 'paid'];
    const hasAllowedStatus = allowedStatuses.includes(submittedClaim.status);
    const isOwnClaim = submittedClaim.employeeId._id.toString() === financeManager._id.toString();
    
    console.log(`  - Claim status: ${submittedClaim.status}`);
    console.log(`  - Has allowed status: ${hasAllowedStatus}`);
    console.log(`  - Is own claim: ${isOwnClaim}`);
    console.log(`  - Can access: ${isOwnClaim || hasAllowedStatus}`);

    if (isOwnClaim || hasAllowedStatus) {
      console.log('  ✅ Finance manager CAN access this claim');
      console.log('  ✅ Finance manager should see approval button in UI');
    } else {
      console.log('  ❌ Finance manager CANNOT access this claim');
    }

    // Test the frontend logic
    console.log('\n🎯 Frontend Logic Test:');
    console.log(`  - canApproveClaim check: ${submittedClaim.status === 'approved' && submittedClaim.employeeId._id !== financeManager._id}`);
    
    if (submittedClaim.status === 'approved' && submittedClaim.employeeId._id !== financeManager._id) {
      console.log('  ✅ Frontend should show approval button for finance manager');
    } else {
      console.log('  ❌ Frontend will NOT show approval button for finance manager');
    }

    console.log('\n=== Test Scenario Summary ===');
    console.log('✅ Created test scenario with supervisor-approved claim');
    console.log('✅ Finance manager should now see this claim in their dashboard');
    console.log('✅ Finance manager should see approval button for this claim');
    console.log('\n🎯 Next steps:');
    console.log('1. Login as finance manager');
    console.log('2. Check if the approved claim appears in the dashboard');
    console.log('3. Check if the approval button (thumbs up) is visible');
    console.log('4. Try to approve the claim');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
createTestApprovalScenario();
