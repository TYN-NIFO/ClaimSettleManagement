const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './config.env' });

const assignSupervisors = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all supervisors
    const supervisors = await User.find({ 
      role: 'supervisor',
      isActive: true 
    });
    
    console.log(`Found ${supervisors.length} supervisors`);

    // Find all employees
    const employees = await User.find({ 
      role: 'employee',
      isActive: true 
    });
    
    console.log(`Found ${employees.length} employees`);

    if (supervisors.length === 0) {
      console.log('⚠️  No supervisors found. Creating a test supervisor...');
      
      // Create a test supervisor
      const supervisor = new User({
        name: 'Test Supervisor',
        email: 'supervisor@company.com',
        password: 'supervisor123',
        role: 'supervisor',
        supervisorLevel: 1,
        department: 'IT',
        createdBy: employees[0]?._id || '000000000000000000000000'
      });
      
      await supervisor.save();
      console.log('✅ Created test supervisor');
    }

    if (employees.length === 0) {
      console.log('⚠️  No employees found. Creating a test employee...');
      
      // Create a test employee
      const employee = new User({
        name: 'Test Employee',
        email: 'employee@company.com',
        password: 'employee123',
        role: 'employee',
        department: 'IT',
        createdBy: supervisors[0]?._id || '000000000000000000000000'
      });
      
      await employee.save();
      console.log('✅ Created test employee');
    }

    // Get updated lists
    const updatedSupervisors = await User.find({ 
      role: 'supervisor',
      isActive: true 
    });
    
    const updatedEmployees = await User.find({ 
      role: 'employee',
      isActive: true 
    });

    // Assign supervisors to employees
    for (let i = 0; i < updatedEmployees.length; i++) {
      const employee = updatedEmployees[i];
      const supervisor = updatedSupervisors[i % updatedSupervisors.length];
      
      if (supervisor) {
        employee.assignedSupervisor1 = supervisor._id;
        await employee.save();
        console.log(`✅ Assigned ${supervisor.name} to ${employee.name}`);
      }
    }

    console.log('🎉 Supervisor assignment completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Assignment error:', error);
    process.exit(1);
  }
};

assignSupervisors();
