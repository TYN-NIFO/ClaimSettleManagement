import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../models/Leave.js';
import Claim from '../models/Claim.js';

// Load environment variables
dotenv.config();

const cleanupTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    console.log('🧹 Cleaning up test data...\n');

    // Find and remove any leaves created during testing (with IDs >= 295)
    const testLeaves = await Leave.find({
      leaveId: { $regex: /^leave_2025_(00295|00296|00297|00298|00299|003\d\d)$/ }
    });

    if (testLeaves.length > 0) {
      console.log(`Found ${testLeaves.length} test leave records to remove:`);
      testLeaves.forEach(leave => {
        console.log(`  - ${leave.leaveId} (${leave.type})`);
      });

      await Leave.deleteMany({
        leaveId: { $regex: /^leave_2025_(00295|00296|00297|00298|00299|003\d\d)$/ }
      });
      console.log(`✅ Removed ${testLeaves.length} test leave records`);
    } else {
      console.log('No test leave records found to remove');
    }

    // Find and remove any claims created during testing (with IDs >= 1)
    const testClaims = await Claim.find({
      claimId: { $regex: /^claim_2025_(00001|00002|00003|0000[4-9]|000[1-9]\d)$/ }
    });

    if (testClaims.length > 0) {
      console.log(`\nFound ${testClaims.length} test claim records to remove:`);
      testClaims.forEach(claim => {
        console.log(`  - ${claim.claimId}`);
      });

      await Claim.deleteMany({
        claimId: { $regex: /^claim_2025_(00001|00002|00003|0000[4-9]|000[1-9]\d)$/ }
      });
      console.log(`✅ Removed ${testClaims.length} test claim records`);
    } else {
      console.log('No test claim records found to remove');
    }

    // Reset counters to proper values
    console.log('\n🔄 Resetting counters...');

    // Find the actual highest leave sequence from real data
    const realLeaves = await Leave.find({ 
      leaveId: { $exists: true, $ne: null },
      createdAt: { $lt: new Date('2024-12-12T04:58:00Z') } // Before our testing started
    }).sort({ leaveId: -1 }).limit(10);

    let maxLeaveSeq = 286; // Default from original request
    if (realLeaves.length > 0) {
      const sequences = realLeaves
        .map(leave => {
          const match = leave.leaveId.match(/leave_\d{4}_(\d{5})/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);
      
      if (sequences.length > 0) {
        maxLeaveSeq = Math.max(...sequences);
      }
    }

    // Reset leave counter
    await mongoose.connection.db.collection('counters').updateOne(
      { _id: 'leaveId' },
      { $set: { seq: maxLeaveSeq } },
      { upsert: true }
    );
    console.log(`✅ Reset leave counter to: ${maxLeaveSeq}`);

    // Reset claim counter to 0 (no real claims with new ID format yet)
    await mongoose.connection.db.collection('counters').updateOne(
      { _id: 'claimId' },
      { $set: { seq: 0 } },
      { upsert: true }
    );
    console.log(`✅ Reset claim counter to: 0`);

    // Verify final state
    const finalCounters = await mongoose.connection.db.collection('counters').find({}).toArray();
    console.log('\n📊 Final counter values:');
    finalCounters.forEach(counter => {
      console.log(`  ${counter._id}: ${counter.seq}`);
    });

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('The system is now ready for production use.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the cleanup
cleanupTestData();