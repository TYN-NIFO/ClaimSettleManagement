import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Claim from '../models/Claim.js';
import User from '../models/User.js';

dotenv.config();

async function debugClaims() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    console.log('Fetching claims...');
    // We fetch everything and log details for troubleshooting
    const claims = await Claim.find()
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 });

    console.log(`Found ${claims.length} claims.\n`);

    if (claims.length === 0) {
      console.log('No claims found in the database.');
    }

    claims.forEach((claim, index) => {
      console.log(`--- Claim ${index + 1} ---`);
      console.log(`ID: ${claim._id}`);
      console.log(`Claim ID: ${claim.claimId || 'N/A'}`);
      console.log(`Employee Name: ${claim.employeeId?.name || 'Unknown User'}`);
      console.log(`Employee Email: ${claim.employeeId?.email || 'No Email'}`);
      console.log(`Department: ${claim.employeeId?.department || 'Unknown'}`);
      console.log(`Status: ${claim.status}`);
      console.log(`Category: ${claim.category}`);
      console.log(`Grand Total: ${claim.grandTotal}`);

      console.log('Line Items:');
      if (claim.lineItems && claim.lineItems.length > 0) {
        claim.lineItems.forEach((item, i) => {
          console.log(`  Item ${i + 1}: ${item.description}`);
          console.log(`    Date: ${item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'N/A'}`);
          console.log(`    Amount: ${item.amountInINR || item.amount} INR`);

          if (item.attachments && item.attachments.length > 0) {
            console.log('    Documents:');
            item.attachments.forEach(att => {
              console.log(`      - Name: ${att.name}`);
              console.log(`        URL: ${att.url}`);
            });
          } else {
            console.log('    Documents: None');
          }
        });
      } else {
        console.log('  None');
      }

      console.log('------------------------\n');
    });

  } catch (error) {
    console.error('DEBUG ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

debugClaims();
