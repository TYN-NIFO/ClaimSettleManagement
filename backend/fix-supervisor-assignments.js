import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const fixSupervisorAssignments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the supervisor
    const supervisor = await User.findOne({ 
      role: 'supervisor',
      isActive: true 
    });
    
    if (!supervisor) {
      console.log('❌ No supervisor found!');
      process.exit(1);
    }

    console.log(`Found supervisor: ${supervisor.name} (${supervisor.email})`);

    // Find all employees without assigned supervisors
    const employees = await User.find({ 
      role: 'employee',
      isActive: true,
      $or: [
        { assignedSupervisor1: { $exists: false } },
        { assignedSupervisor1: null },
        { assignedSupervisor1: undefined }
      ]
    });
    
    console.log(`Found ${employees.length} employees without assigned supervisors:`);
    employees.forEach(emp => {
      console.log(`  - ${emp.name} (${emp.email})`);
    });

    // Assign the supervisor to all employees
    let assignedCount = 0;
    for (const employee of employees) {
      employee.assignedSupervisor1 = supervisor._id;
      await employee.save();
      console.log(`✅ Assigned ${supervisor.name} to ${employee.name}`);
      assignedCount++;
    }

    console.log(`\n🎉 Successfully assigned supervisor to ${assignedCount} employees`);

    // Verify the assignments
    console.log('\n=== VERIFICATION ===');
    const updatedEmployees = await User.find({ 
      role: 'employee',
      isActive: true 
    }).populate('assignedSupervisor1', 'name email');

    updatedEmployees.forEach(emp => {
      console.log(`${emp.name} -> Supervisor: ${emp.assignedSupervisor1?.name || 'NONE'}`);
    });

    // Test the supervisor filter
    console.log('\n=== TESTING SUPERVISOR FILTER ===');
    const assignedEmployees = await User.find({
      $or: [
        { assignedSupervisor1: supervisor._id },
        { assignedSupervisor2: supervisor._id }
      ]
    }).select('name email');
    
    console.log(`Supervisor ${supervisor.name} can now see claims from ${assignedEmployees.length} employees:`);
    assignedEmployees.forEach(emp => {
      console.log(`  - ${emp.name} (${emp.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixSupervisorAssignments();