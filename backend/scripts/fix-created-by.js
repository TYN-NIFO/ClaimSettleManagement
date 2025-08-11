import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Claim from '../models/Claim.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFilename = process.env.NODE_ENV === 'production' ? 'config.production.env' : 'config.env';
const envPath = path.join(__dirname, '..', envFilename);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const fixCreatedBy = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims');
    console.log('Connected to MongoDB');

    // Find claims without createdBy field
    const claimsWithoutCreatedBy = await Claim.find({ createdBy: { $exists: false } });
    console.log(`Found ${claimsWithoutCreatedBy.length} claims without createdBy field`);

    if (claimsWithoutCreatedBy.length === 0) {
      console.log('No claims need fixing');
      return;
    }

    // Fix each claim by setting createdBy to employeeId
    for (const claim of claimsWithoutCreatedBy) {
      claim.createdBy = claim.employeeId;
      await claim.save();
      console.log(`Fixed claim ${claim._id} - set createdBy to ${claim.employeeId}`);
    }

    console.log('Successfully fixed all claims');
  } catch (error) {
    console.error('Error fixing claims:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixCreatedBy();
