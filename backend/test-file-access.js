import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Claim from './models/Claim.js';
import User from './models/User.js';

// Load environment variables
dotenv.config({ path: './config.env' });

const testFileAccess = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find the specific file
    const storageKey = 'd8a0a0e9-6b33-4d8f-b727-2e3794c4be55.pdf';
    
    const claim = await Claim.findOne({
      'lineItems.attachments.storageKey': storageKey
    });

    if (!claim) {
      console.log('❌ Claim not found for file:', storageKey);
      return;
    }

    console.log('📄 Found claim for file:', {
      claimId: claim._id,
      employeeId: claim.employeeId,
      status: claim.status,
      createdAt: claim.createdAt
    });

    // Find finance manager and supervisor users
    const financeManager = await User.findOne({ role: 'finance_manager' });
    const supervisor = await User.findOne({ role: 'supervisor' });

    if (!financeManager) {
      console.log('❌ No finance manager found');
      return;
    }

    if (!supervisor) {
      console.log('❌ No supervisor found');
      return;
    }

    console.log('👥 Users found:', {
      financeManager: {
        id: financeManager._id,
        email: financeManager.email,
        role: financeManager.role
      },
      supervisor: {
        id: supervisor._id,
        email: supervisor.email,
        role: supervisor.role
      }
    });

    // Test finance manager access logic
    console.log('\n🔍 Testing Finance Manager Access:');
    
    // Check if finance manager is the employee
    const isOwnClaim = claim.employeeId.toString() === financeManager._id.toString();
    console.log('Is own claim:', isOwnClaim);
    
    // Check claim status
    const allowedStatuses = ['approved', 'finance_approved', 'paid'];
    const hasAllowedStatus = allowedStatuses.includes(claim.status);
    console.log('Has allowed status:', hasAllowedStatus, '(status:', claim.status, ')');
    
    // With new logic, finance manager should have access to all claims
    console.log('✅ Finance manager should now have access to all claims');

    // Test supervisor access logic
    console.log('\n🔍 Testing Supervisor Access:');
    
    const assignedEmployees = await User.find({
      $or: [
        { assignedSupervisor1: supervisor._id },
        { assignedSupervisor2: supervisor._id }
      ]
    }).select('_id');
    
    const employeeIds = assignedEmployees.map(emp => emp._id.toString());
    const hasAssignedEmployee = employeeIds.includes(claim.employeeId.toString());
    
    console.log('Assigned employees:', employeeIds);
    console.log('Claim employee:', claim.employeeId.toString());
    console.log('Has assigned employee:', hasAssignedEmployee);

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

testFileAccess();
