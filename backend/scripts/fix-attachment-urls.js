import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Claim from '../models/Claim.js';

dotenv.config();

async function fixAttachmentUrls() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    const bucket = process.env.AWS_S3_BUCKET_NAME || 'tyn-claims-app-storage-prod';
    const region = process.env.AWS_REGION || 'us-east-1';
    const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com/`;

    console.log(`Using Base URL: ${baseUrl}`);

    const claims = await Claim.find({
      $or: [
        { 'lineItems.attachments.url': { $exists: false } },
        { 'lineItems.attachments.url': null },
        { 'lineItems.attachments.url': 'undefined' }
      ]
    });

    console.log(`Found ${claims.length} claims that may need repairing...`);

    let totalFixed = 0;
    let claimsModified = 0;

    for (const claim of claims) {
      let claimNeedsUpdate = false;

      // Check line item attachments
      claim.lineItems.forEach(item => {
        item.attachments.forEach(att => {
          if ((!att.url || att.url === 'undefined') && att.storageKey) {
            att.url = baseUrl + att.storageKey;
            totalFixed++;
            claimNeedsUpdate = true;
          }
        });
      });

      // Check top-level attachments if any
      if (claim.attachments) {
        claim.attachments.forEach(att => {
          if ((!att.url || att.url === 'undefined') && att.storageKey) {
            att.url = baseUrl + att.storageKey;
            totalFixed++;
            claimNeedsUpdate = true;
          }
        });
      }

      if (claimNeedsUpdate) {
        // We use markModified because lineItems is an array of subdocuments
        claim.markModified('lineItems');
        claim.markModified('attachments');
        await claim.save();
        claimsModified++;
        console.log(`Fixed ${claim.claimId || claim._id}`);
      }
    }

    console.log(`\n REPAIR COMPLETE:`);
    console.log(`- Total URLs reconstructed: ${totalFixed}`);
    console.log(`- Total Claims updated: ${claimsModified}`);

  } catch (error) {
    console.error('REPAIR ERROR:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

fixAttachmentUrls();
