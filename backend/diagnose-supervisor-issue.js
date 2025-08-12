import mongoose from 'mongoose';
import User from './models/User.js';
import Claim from './models/Claim.js';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const diagnoseSupervisorIssue = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== SUPERVISOR CLAIMS ISSUE DIAGNOSIS ===\n');

    // 1. Check all users
    const users = await User.find({}).select('name email role assignedSupervisor1 assignedSupervisor2 isActive');
    console.log('1. USER ANALYSIS:');
    console.log(`   Total users: ${users.length}`);
    
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) usersByRole[user.role] = [];
      usersByRole[user.role].push(user);
    });

    Object.keys(usersByRole).forEach(role => {
      console.log(`   ${role.toUpperCase()}S: ${usersByRole[role].length}`);
      usersByRole[role].forEach(user => {
        console.log(`     - ${user.name} (${user.email}) - Active: ${user.isActive}`);
      });
    });

    // 2. Check supervisor assignments
    console.log('\n2. SUPERVISOR ASSIGNMENT ANALYSIS:');
    const employees = users.filter(u => u.role === 'employee' && u.isActive);
    const supervisors = users.filter(u => u.role === 'supervisor' && u.isActive);
    
    console.log(`   Active employees: ${employees.length}`);
    console.log(`   Active supervisors: ${supervisors.length}`);
    
    const employeesWithSupervisors = employees.filter(emp => emp.assignedSupervisor1 || emp.assignedSupervisor2);
    const employeesWithoutSupervisors = employees.filter(emp => !emp.assignedSupervisor1 && !emp.assignedSupervisor2);
    
    console.log(`   Employees WITH assigned supervisors: ${employeesWithSupervisors.length}`);
    console.log(`   Employees WITHOUT assigned supervisors: ${employeesWithoutSupervisors.length}`);
    
    if (employeesWithoutSupervisors.length > 0) {
      console.log('   ❌ PROBLEM IDENTIFIED: Employees without supervisors:');
      employeesWithoutSupervisors.forEach(emp => {
        console.log(`     - ${emp.name} (${emp.email})`);
      });
    }

    // 3. Check claims
    console.log('\n3. CLAIMS ANALYSIS:');
    const claims = await Claim.find({}).populate('employeeId', 'name email role');
    console.log(`   Total claims: ${claims.length}`);
    
    if (claims.length > 0) {
      const claimsByStatus = {};
      claims.forEach(claim => {
        if (!claimsByStatus[claim.status]) claimsByStatus[claim.status] = 0;
        claimsByStatus[claim.status]++;
      });
      
      console.log('   Claims by status:');
      Object.keys(claimsByStatus).forEach(status => {
        console.log(`     - ${status}: ${claimsByStatus[status]}`);
      });
      
      console.log('   Claims by employee:');
      claims.forEach((claim, index) => {
        console.log(`     ${index + 1}. ${claim.employeeId?.name} (${claim.employeeId?.role}) - Status: ${claim.status} - Amount: ₹${claim.grandTotal || 0}`);
      });
    }

    // 4. Test supervisor filter for each supervisor
    console.log('\n4. SUPERVISOR FILTER TEST:');
    if (supervisors.length > 0) {
      for (const supervisor of supervisors) {
        console.log(`   Testing filter for: ${supervisor.name} (${supervisor.email})`);
        
        // This is the exact logic from the API
        const assignedEmployees = await User.find({
          $or: [
            { assignedSupervisor1: supervisor._id },
            { assignedSupervisor2: supervisor._id }
          ]
        }).select('name email');
        
        console.log(`     Assigned employees: ${assignedEmployees.length}`);
        if (assignedEmployees.length === 0) {
          console.log('     ❌ NO EMPLOYEES ASSIGNED - This is why supervisor sees no claims!');
        } else {
          assignedEmployees.forEach(emp => {
            console.log(`       - ${emp.name} (${emp.email})`);
          });
        }
        
        // Test the actual filter used in the API
        const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
        assignedEmployeeIds.push(supervisor._id); // Include their own claims
        
        const supervisorClaims = await Claim.find({
          employeeId: { $in: assignedEmployeeIds }
        }).populate('employeeId', 'name email');
        
        console.log(`     Claims visible to supervisor: ${supervisorClaims.length}`);
        if (supervisorClaims.length === 0) {
          console.log('     ❌ NO CLAIMS VISIBLE - Supervisor dashboard will be empty!');
        } else {
          supervisorClaims.forEach(claim => {
            console.log(`       - ${claim.employeeId?.name}: ${claim.status} (₹${claim.grandTotal || 0})`);
          });
        }
      }
    } else {
      console.log('   ❌ NO SUPERVISORS FOUND!');
    }

    // 5. Provide solution
    console.log('\n5. SOLUTION:');
    if (employeesWithoutSupervisors.length > 0 && supervisors.length > 0) {
      console.log('   ✅ SOLUTION IDENTIFIED:');
      console.log('   The issue is that employees are not assigned to supervisors.');
      console.log('   To fix this, run: node fix-supervisor-assignments.js');
      console.log('   This will assign all employees to the available supervisor.');
    } else if (supervisors.length === 0) {
      console.log('   ❌ NO SUPERVISORS EXIST:');
      console.log('   You need to create a supervisor user first.');
      console.log('   Run: node scripts/seed-tyn-users.js to create all required users.');
    } else {
      console.log('   ✅ All employees are properly assigned to supervisors.');
      console.log('   The issue might be elsewhere. Check the frontend or API logs.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

diagnoseSupervisorIssue();