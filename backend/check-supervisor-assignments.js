import mongoose from 'mongoose';
import User from './models/User.js';
import Claim from './models/Claim.js';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const checkAssignments = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check all users and their supervisor assignments
    const users = await User.find({}).select('name email role assignedSupervisor1 assignedSupervisor2 isActive');
    
    console.log('\n=== USER ANALYSIS ===');
    console.log(`Total users: ${users.length}`);
    
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) usersByRole[user.role] = [];
      usersByRole[user.role].push(user);
    });

    Object.keys(usersByRole).forEach(role => {
      console.log(`\n${role.toUpperCase()}S (${usersByRole[role].length}):`);
      usersByRole[role].forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Active: ${user.isActive}`);
        if (user.assignedSupervisor1 || user.assignedSupervisor2) {
          console.log(`    Supervisors: ${user.assignedSupervisor1 || 'none'}, ${user.assignedSupervisor2 || 'none'}`);
        }
      });
    });

    // Check supervisor assignments specifically
    console.log('\n=== SUPERVISOR ASSIGNMENTS ===');
    const employees = users.filter(u => u.role === 'employee');
    const supervisors = users.filter(u => u.role === 'supervisor');
    
    console.log(`Employees: ${employees.length}, Supervisors: ${supervisors.length}`);
    
    const employeesWithSupervisors = employees.filter(emp => emp.assignedSupervisor1 || emp.assignedSupervisor2);
    console.log(`Employees with assigned supervisors: ${employeesWithSupervisors.length}`);
    
    if (employeesWithSupervisors.length === 0) {
      console.log('❌ NO EMPLOYEES HAVE ASSIGNED SUPERVISORS!');
      console.log('This is why supervisors cannot see any claims.');
    }

    // Check claims
    console.log('\n=== CLAIMS ANALYSIS ===');
    const claims = await Claim.find({}).populate('employeeId', 'name email role');
    console.log(`Total claims: ${claims.length}`);
    
    claims.forEach((claim, index) => {
      console.log(`${index + 1}. ${claim.employeeId?.name} (${claim.employeeId?.role}) - Status: ${claim.status}`);
    });

    // Test supervisor filter for each supervisor
    if (supervisors.length > 0) {
      console.log('\n=== SUPERVISOR FILTER TEST ===');
      for (const supervisor of supervisors) {
        console.log(`\nTesting filter for supervisor: ${supervisor.name}`);
        
        const assignedEmployees = await User.find({
          $or: [
            { assignedSupervisor1: supervisor._id },
            { assignedSupervisor2: supervisor._id }
          ]
        }).select('name email');
        
        console.log(`  Assigned employees: ${assignedEmployees.length}`);
        assignedEmployees.forEach(emp => {
          console.log(`    - ${emp.name} (${emp.email})`);
        });
        
        const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
        assignedEmployeeIds.push(supervisor._id);
        
        const supervisorClaims = await Claim.find({
          employeeId: { $in: assignedEmployeeIds }
        }).populate('employeeId', 'name email');
        
        console.log(`  Claims visible to supervisor: ${supervisorClaims.length}`);
        supervisorClaims.forEach(claim => {
          console.log(`    - ${claim.employeeId?.name}: ${claim.status}`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkAssignments();