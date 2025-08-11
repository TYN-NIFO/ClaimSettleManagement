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

const testSupervisorFilter = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims');
    console.log('Connected to MongoDB');

    // Find Velan (supervisor)
    const velan = await User.findOne({ email: 'velan@theyellow.network' });
    if (!velan) {
      console.log('Velan not found');
      process.exit(1);
    }

    console.log(`\n=== Testing Supervisor Filter for: ${velan.name} (${velan.email}) ===`);

    // Get assigned employees
    const assignedEmployees = await User.find({
      $or: [
        { assignedSupervisor1: velan._id },
        { assignedSupervisor2: velan._id }
      ]
    }).select('_id name email');

    console.log('\nAssigned Employees:');
    assignedEmployees.forEach(emp => {
      console.log(`- ${emp.name} (${emp.email})`);
    });

    // Create the filter that the backend uses
    const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
    assignedEmployeeIds.push(velan._id); // Include their own claims

    console.log('\nEmployee IDs in filter:', assignedEmployeeIds);

    // Apply the filter
    const filter = {
      employeeId: { $in: assignedEmployeeIds }
    };

    console.log('\nFilter applied:', JSON.stringify(filter, null, 2));

    // Get claims with this filter
    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 });

    console.log(`\n=== Claims Found: ${claims.length} ===`);
    
    claims.forEach((claim, index) => {
      console.log(`\n${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Employee Role: ${claim.employeeId?.role}`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Category: ${claim.category}`);
      console.log(`   Amount: ₹${claim.grandTotal}`);
      console.log(`   Created: ${claim.createdAt}`);
    });

    // Also check all claims without filter
    const allClaims = await Claim.find({})
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 });

    console.log(`\n=== All Claims in Database: ${allClaims.length} ===`);
    allClaims.forEach((claim, index) => {
      console.log(`\n${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Employee Role: ${claim.employeeId?.role}`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Category: ${claim.category}`);
      console.log(`   Amount: ₹${claim.grandTotal}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testSupervisorFilter();
