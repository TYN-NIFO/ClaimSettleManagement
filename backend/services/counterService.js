import mongoose from 'mongoose';

/**
 * Atomic counter service for generating unique sequential IDs
 * Uses MongoDB's findOneAndUpdate with $inc for thread-safe operations
 */

/**
 * Get the next sequence number for leave IDs
 * @returns {Promise<number>} The next sequence number
 */
export async function getNextLeaveSequence() {
  try {
    // First, ensure the counter exists with a default value
    await mongoose.connection.db.collection("counters").updateOne(
      { _id: "leaveId" },
      { $setOnInsert: { seq: 286 } }, // Default starting value
      { upsert: true }
    );

    // Now increment and get the new value
    const result = await mongoose.connection.db.collection("counters").findOneAndUpdate(
      { _id: "leaveId" },        // counter key
      { $inc: { seq: 1 } },      // atomic increment
      {
        returnDocument: "after",  // return updated value
        upsert: true              // create the document if missing
      }
    );
    
    // Handle case where result might be null or seq might be undefined
    if (!result || !result.value || result.value.seq === undefined || result.value.seq === null) {
      console.error('Counter result is invalid:', result);
      throw new Error('Invalid counter result - seq is undefined');
    }
    
    return result.value.seq;
  } catch (error) {
    console.error('Error getting next leave sequence:', error);
    throw new Error('Failed to generate leave sequence number: ' + error.message);
  }
}

/**
 * Get the next sequence number for claim IDs
 * @returns {Promise<number>} The next sequence number
 */
export async function getNextClaimSequence() {
  try {
    // First, ensure the counter exists with a default value
    await mongoose.connection.db.collection("counters").updateOne(
      { _id: "claimId" },
      { $setOnInsert: { seq: 0 } }, // Default starting value
      { upsert: true }
    );

    // Now increment and get the new value
    const result = await mongoose.connection.db.collection("counters").findOneAndUpdate(
      { _id: "claimId" },        // counter key
      { $inc: { seq: 1 } },      // atomic increment
      {
        returnDocument: "after",  // return updated value
        upsert: true              // create the document if missing
      }
    );
    
    // Handle case where result might be null or seq might be undefined
    if (!result || !result.value || result.value.seq === undefined || result.value.seq === null) {
      console.error('Counter result is invalid:', result);
      throw new Error('Invalid counter result - seq is undefined');
    }
    
    return result.value.seq;
  } catch (error) {
    console.error('Error getting next claim sequence:', error);
    throw new Error('Failed to generate claim sequence number: ' + error.message);
  }
}

/**
 * Generic function to get next sequence for any counter type
 * @param {string} counterType - The type of counter (e.g., 'leaveId', 'claimId', 'invoiceId')
 * @returns {Promise<number>} The next sequence number
 */
export async function getNextSequence(counterType) {
  try {
    const result = await mongoose.connection.db.collection("counters").findOneAndUpdate(
      { _id: counterType },      // counter key
      { $inc: { seq: 1 } },      // atomic increment
      {
        returnDocument: "after",  // return updated value
        upsert: true              // create the document if missing
      }
    );
    
    // Handle case where result might be null or seq might be undefined
    if (!result || !result.value || result.value.seq === undefined || result.value.seq === null) {
      console.error('Counter result is invalid:', result);
      throw new Error('Invalid counter result');
    }
    
    return result.value.seq;
  } catch (error) {
    console.error(`Error getting next ${counterType} sequence:`, error);
    throw new Error(`Failed to generate ${counterType} sequence number`);
  }
}

/**
 * Initialize a counter with a specific starting value
 * @param {string} counterType - The type of counter
 * @param {number} startValue - The starting value for the counter
 * @returns {Promise<boolean>} Success status
 */
export async function initializeCounter(counterType, startValue = 0) {
  try {
    await mongoose.connection.db.collection("counters").updateOne(
      { _id: counterType },
      { $setOnInsert: { seq: startValue } },
      { upsert: true }
    );
    
    console.log(`Counter ${counterType} initialized with starting value: ${startValue}`);
    return true;
  } catch (error) {
    console.error(`Error initializing counter ${counterType}:`, error);
    throw new Error(`Failed to initialize ${counterType} counter`);
  }
}

/**
 * Get current counter value without incrementing
 * @param {string} counterType - The type of counter
 * @returns {Promise<number>} Current counter value
 */
export async function getCurrentSequence(counterType) {
  try {
    const result = await mongoose.connection.db.collection("counters").findOne(
      { _id: counterType }
    );
    
    return result ? result.seq : 0;
  } catch (error) {
    console.error(`Error getting current ${counterType} sequence:`, error);
    throw new Error(`Failed to get current ${counterType} sequence`);
  }
}