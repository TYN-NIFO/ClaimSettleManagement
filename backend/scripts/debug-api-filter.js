import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Claim from '../models/Claim.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'config.production.env') });

const debugApiFilter = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims');
    console.log('Connected to MongoDB');

    // Simulate the exact API logic
    const userId = '68959b9b3e04982d0d21afcc'; // Velan's ID
    const page = 1;
    const limit = 50;
    const filter = {};

    console.log('\n=== SIMULATING API LOGIC ===');
    console.log('User ID:', userId);
    console.log('Page:', page);
    console.log('Limit:', limit);

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('User found:', { id: user._id, name: user.name, email: user.email, role: user.role });

    // Role-based filtering (supervisor logic)
    if (user.role === 'supervisor') {
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id name email');
      
      console.log('Assigned employees found:', assignedEmployees);
      
      const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
      assignedEmployeeIds.push(user._id); // Include their own claims
      
      console.log('Employee IDs in filter:', assignedEmployeeIds);
      
      filter.employeeId = { $in: assignedEmployeeIds };
      console.log('Supervisor filter applied:', JSON.stringify(filter, null, 2));
    }

    console.log('Final filter:', JSON.stringify(filter, null, 2));

    // Test the exact query from the API
    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .populate('supervisorApproval.approvedBy', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('payment.paidBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('Claims found:', claims.length);
    claims.forEach((claim, index) => {
      console.log(`${index + 1}. Claim ID: ${claim._id}, Employee: ${claim.employeeId?.name} (${claim.employeeId?.email}), Status: ${claim.status}`);
    });

    const count = await Claim.countDocuments(filter);
    console.log('Total count with filter:', count);

    // Test without pagination
    console.log('\n=== TESTING WITHOUT PAGINATION ===');
    const allClaims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .sort({ createdAt: -1 });

    console.log('All claims without pagination:', allClaims.length);
    allClaims.forEach((claim, index) => {
      console.log(`${index + 1}. Claim ID: ${claim._id}, Employee: ${claim.employeeId?.name} (${claim.employeeId?.email}), Status: ${claim.status}`);
    });

    // Test the filter step by step
    console.log('\n=== STEP BY STEP FILTER TEST ===');
    
    // Step 1: Check all claims
    const totalClaims = await Claim.countDocuments({});
    console.log('Total claims in database:', totalClaims);
    
    // Step 2: Check claims with employeeId filter only
    const employeeFilter = { employeeId: { $in: ['68959bb43e04982d0d21afd4', '68959b9b3e04982d0d21afcc'] } };
    const employeeFilterCount = await Claim.countDocuments(employeeFilter);
    console.log('Claims with employee filter:', employeeFilterCount);
    
    // Step 3: Check each employee individually
    const rakeshClaims = await Claim.countDocuments({ employeeId: '68959bb43e04982d0d21afd4' });
    const velanClaims = await Claim.countDocuments({ employeeId: '68959b9b3e04982d0d21afcc' });
    console.log('Rakesh claims:', rakeshClaims);
    console.log('Velan claims:', velanClaims);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

debugApiFilter();
