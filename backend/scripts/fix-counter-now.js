import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixCounterNow = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if counters collection exists
    const collections = await mongoose.connection.db.listCollections({ name: 'counters' }).toArray();
    
    if (collections.length === 0) {
      console.log('Counters collection does not exist. Creating it...');
    }

    // Initialize leave counter with a safe starting value
    const leaveCounterResult = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'leaveId' },
      { $setOnInsert: { seq: 286 } }, // Start from 286 as mentioned in the original request
      { upsert: true, returnDocument: 'after' }
    );
    
    console.log('Leave counter result:', leaveCounterResult);

    // Initialize claim counter
    const claimCounterResult = await mongoose.connection.db.collection('counters').findOneAndUpdate(
      { _id: 'claimId' },
      { $setOnInsert: { seq: 0 } },
      { upsert: true, returnDocument: 'after' }
    );
    
    console.log('Claim counter result:', claimCounterResult);

    // Verify the counters
    const allCounters = await mongoose.connection.db.collection('counters').find({}).toArray();
    console.log('All counters:', allCounters);

    // Test the counter service
    console.log('\nTesting counter service...');
    
    const testResult = await mongoose.connection.db.collection("counters").findOneAndUpdate(
      { _id: "leaveId" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true }
    );
    
    console.log('Test increment result:', testResult);
    console.log('Test increment successful. Next sequence:', testResult.value?.seq);

    console.log('\n✅ Counter fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing counter:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the fix
fixCounterNow();