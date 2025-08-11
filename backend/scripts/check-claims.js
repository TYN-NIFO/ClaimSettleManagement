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

const checkClaims = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims');
    console.log('Connected to MongoDB');

    // Get all claims with employee details
    const claims = await Claim.find({})
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 });

    console.log(`\n=== Total Claims: ${claims.length} ===`);
    
    claims.forEach((claim, index) => {
      console.log(`\n${index + 1}. Claim ID: ${claim._id}`);
      console.log(`   Employee: ${claim.employeeId?.name} (${claim.employeeId?.email})`);
      console.log(`   Employee Role: ${claim.employeeId?.role}`);
      console.log(`   Status: ${claim.status}`);
      console.log(`   Category: ${claim.category}`);
      console.log(`   Amount: ₹${claim.grandTotal}`);
      console.log(`   Created: ${claim.createdAt}`);
      console.log(`   Created By: ${claim.createdBy}`);
    });

    // Check users
    console.log('\n=== Users ===');
    const users = await User.find({}).select('name email role');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Check supervisor assignments
    console.log('\n=== Supervisor Assignments ===');
    const supervisors = await User.find({ role: 'supervisor' }).select('name email');
    for (const supervisor of supervisors) {
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: supervisor._id },
          { assignedSupervisor2: supervisor._id }
        ]
      }).select('name email');
      
      console.log(`\nSupervisor: ${supervisor.name} (${supervisor.email})`);
      console.log('Assigned Employees:');
      if (assignedEmployees.length === 0) {
        console.log('  - No employees assigned');
      } else {
        assignedEmployees.forEach(emp => {
          console.log(`  - ${emp.name} (${emp.email})`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkClaims();
