import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Leave from '../models/Leave.js';
import Claim from '../models/Claim.js';
import { initializeCounter } from '../services/counterService.js';

// Load environment variables
dotenv.config();

const initializeCounters = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Initialize leave counter
    console.log('Initializing leave counter...');
    
    // Find the highest existing leave sequence number
    const leaves = await Leave.find({ leaveId: { $exists: true, $ne: null } })
      .sort({ leaveId: -1 })
      .limit(10);
    
    let maxLeaveSeq = 0;
    if (leaves.length > 0) {
      // Extract sequence numbers from existing leave IDs
      const sequences = leaves
        .map(leave => {
          const match = leave.leaveId.match(/leave_\d{4}_(\d{5})/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);
      
      if (sequences.length > 0) {
        maxLeaveSeq = Math.max(...sequences);
      }
    }
    
    console.log(`Found highest leave sequence: ${maxLeaveSeq}`);
    
    // Initialize counter with the next sequence number
    await initializeCounter('leaveId', maxLeaveSeq);
    console.log(`✅ Leave counter initialized with starting value: ${maxLeaveSeq}`);

    // Initialize claim counter
    console.log('Initializing claim counter...');
    
    // Find the highest existing claim sequence number
    const claims = await Claim.find({ claimId: { $exists: true, $ne: null } })
      .sort({ claimId: -1 })
      .limit(10);
    
    let maxClaimSeq = 0;
    if (claims.length > 0) {
      // Extract sequence numbers from existing claim IDs
      const sequences = claims
        .map(claim => {
          const match = claim.claimId.match(/claim_\d{4}_(\d{5})/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(seq => seq > 0);
      
      if (sequences.length > 0) {
        maxClaimSeq = Math.max(...sequences);
      }
    }
    
    console.log(`Found highest claim sequence: ${maxClaimSeq}`);
    
    // Initialize counter with the next sequence number
    await initializeCounter('claimId', maxClaimSeq);
    console.log(`✅ Claim counter initialized with starting value: ${maxClaimSeq}`);

    // Verify counters collection
    const counters = await mongoose.connection.db.collection('counters').find({}).toArray();
    console.log('\n📊 Current counters:');
    counters.forEach(counter => {
      console.log(`  ${counter._id}: ${counter.seq}`);
    });

    console.log('\n🎉 Counter initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing counters:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the initialization
initializeCounters();