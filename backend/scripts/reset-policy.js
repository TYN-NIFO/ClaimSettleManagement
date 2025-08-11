import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Policy from '../models/Policy.js';
import { validCategories, validBusinessUnits } from '../lib/categoryMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config.env') });

async function resetPolicy() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing policies
    const deleteResult = await Policy.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing policies`);

    // Create new policy with correct categories
    const newPolicy = new Policy({
      approvalMode: "both",
      claimCategories: validCategories,
      maxAmountBeforeFinanceManager: 10000,
      allowedFileTypes: ["pdf", "jpg", "jpeg", "png"],
      maxFileSizeMB: 10,
      payoutChannels: ["Bank Transfer", "Cash", "Check"],
      autoAssignSupervisors: false,
      claimRetentionDays: 365,
    });

    await newPolicy.save();
    console.log('Created new policy with categories:', validCategories);
    console.log('Policy ID:', newPolicy._id);

    // Close connection
    await mongoose.connection.close();
    console.log('Policy reset completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting policy:', error);
    process.exit(1);
  }
}

resetPolicy();