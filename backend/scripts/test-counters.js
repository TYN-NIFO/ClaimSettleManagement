import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getNextLeaveSequence, getNextClaimSequence, getCurrentSequence } from '../services/counterService.js';

// Load environment variables
dotenv.config();

const testCounters = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    console.log('🧪 Testing atomic counters...\n');

    // Test leave counter
    console.log('Testing leave counter:');
    const currentLeaveSeq = await getCurrentSequence('leaveId');
    console.log(`Current leave sequence: ${currentLeaveSeq}`);
    
    const nextLeave1 = await getNextLeaveSequence();
    const nextLeave2 = await getNextLeaveSequence();
    const nextLeave3 = await getNextLeaveSequence();
    
    console.log(`Next leave sequences: ${nextLeave1}, ${nextLeave2}, ${nextLeave3}`);
    console.log(`Generated leave IDs:`);
    console.log(`  leave_${new Date().getFullYear()}_${String(nextLeave1).padStart(5, '0')}`);
    console.log(`  leave_${new Date().getFullYear()}_${String(nextLeave2).padStart(5, '0')}`);
    console.log(`  leave_${new Date().getFullYear()}_${String(nextLeave3).padStart(5, '0')}`);

    // Test claim counter
    console.log('\nTesting claim counter:');
    const currentClaimSeq = await getCurrentSequence('claimId');
    console.log(`Current claim sequence: ${currentClaimSeq}`);
    
    const nextClaim1 = await getNextClaimSequence();
    const nextClaim2 = await getNextClaimSequence();
    const nextClaim3 = await getNextClaimSequence();
    
    console.log(`Next claim sequences: ${nextClaim1}, ${nextClaim2}, ${nextClaim3}`);
    console.log(`Generated claim IDs:`);
    console.log(`  claim_${new Date().getFullYear()}_${String(nextClaim1).padStart(5, '0')}`);
    console.log(`  claim_${new Date().getFullYear()}_${String(nextClaim2).padStart(5, '0')}`);
    console.log(`  claim_${new Date().getFullYear()}_${String(nextClaim3).padStart(5, '0')}`);

    // Verify counters collection
    const counters = await mongoose.connection.db.collection('counters').find({}).toArray();
    console.log('\n📊 Final counter values:');
    counters.forEach(counter => {
      console.log(`  ${counter._id}: ${counter.seq}`);
    });

    console.log('\n✅ Counter test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing counters:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the test
testCounters();