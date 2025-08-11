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

const checkVelanClaim = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims');
    console.log('Connected to MongoDB');

    // Find Velan
    const velan = await User.findOne({ email: 'velan@theyellow.network' });
    if (!velan) {
      console.log('Velan not found');
      process.exit(1);
    }

    console.log(`\n=== Checking Velan's Claims ===`);
    console.log('Velan ID:', velan._id);
    console.log('Velan ID string:', velan._id.toString());

    // Check all claims by Velan
    const velanClaims = await Claim.find({ employeeId: velan._id }).populate('employeeId', 'name email');
    console.log(`\nClaims by Velan: ${velanClaims.length}`);
    velanClaims.forEach((claim, index) => {
      console.log(`${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Amount: ₹${claim.grandTotal}`);
      console.log(`   Created: ${claim.createdAt}`);
    });

    // Check all claims in database
    const allClaims = await Claim.find({}).populate('employeeId', 'name email');
    console.log(`\nAll Claims in Database: ${allClaims.length}`);
    allClaims.forEach((claim, index) => {
      console.log(`${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Employee ID: ${claim.employeeId?._id}`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Amount: ₹${claim.grandTotal}`);
    });

    // Test the exact filter that should be applied
    const assignedEmployees = await User.find({
      $or: [
        { assignedSupervisor1: velan._id },
        { assignedSupervisor2: velan._id }
      ]
    }).select('_id name email');

    console.log('\nAssigned Employees:');
    assignedEmployees.forEach(emp => {
      console.log(`- ${emp.name} (${emp.email}) - ID: ${emp._id}`);
    });

    const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
    assignedEmployeeIds.push(velan._id);

    console.log('\nEmployee IDs for filter:');
    assignedEmployeeIds.forEach((id, index) => {
      console.log(`${index + 1}. ${id}`);
    });

    // Test the filter
    const filter = { employeeId: { $in: assignedEmployeeIds } };
    const filteredClaims = await Claim.find(filter).populate('employeeId', 'name email');
    
    console.log(`\nClaims found with filter: ${filteredClaims.length}`);
    filteredClaims.forEach((claim, index) => {
      console.log(`${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Employee ID: ${claim.employeeId?._id}`);
      console.log(`   Status: ${claim.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkVelanClaim();
