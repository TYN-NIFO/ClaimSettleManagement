import mongoose from 'mongoose';
import Claim from '../models/Claim.js';
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

const migrateClaims = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all claims
    const allClaims = await Claim.find({});
    console.log(`📊 Total claims in database: ${allClaims.length}`);

    if (allClaims.length === 0) {
      console.log('📭 No claims to migrate');
      process.exit(0);
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const claim of allClaims) {
      let needsMigration = false;
      const updates = {};

      // Check if claim has old structure fields
      if (claim.subCategories && Array.isArray(claim.subCategories)) {
        needsMigration = true;
        // Remove subCategories array
        updates.$unset = { subCategories: 1 };
      }

      if (claim.accountHead) {
        needsMigration = true;
        // Remove accountHead
        updates.$unset = { ...updates.$unset, accountHead: 1 };
      }

      if (claim.purpose) {
        needsMigration = true;
        // Remove purpose
        updates.$unset = { ...updates.$unset, purpose: 1 };
      }

      // Check line items for old structure
      if (claim.lineItems && claim.lineItems.length > 0) {
        for (let i = 0; i < claim.lineItems.length; i++) {
          const lineItem = claim.lineItems[i];
          const lineItemUpdates = {};

          // Remove old type-specific fields
          const oldFields = [
            'type', 'name', 'from', 'to', 'airline', 'pnr', 'invoiceNo', 
            'trainNo', 'class', 'mode', 'kilometers', 'city', 
            'mealType', 'checkIn', 'checkOut', 'nights', 'gst', 
            'attendeeCount', 'customer', 'notes'
          ];

          oldFields.forEach(field => {
            if (lineItem[field] !== undefined) {
              lineItemUpdates[`lineItems.${i}.${field}`] = 1;
            }
          });

          if (Object.keys(lineItemUpdates).length > 0) {
            needsMigration = true;
            updates.$unset = { ...updates.$unset, ...lineItemUpdates };
          }

          // Ensure subCategory exists
          if (!lineItem.subCategory && lineItem.type) {
            needsMigration = true;
            updates.$set = { 
              ...updates.$set, 
              [`lineItems.${i}.subCategory`]: lineItem.type 
            };
          }

          // Convert name to description if description doesn't exist
          if (!lineItem.description && lineItem.name) {
            needsMigration = true;
            updates.$set = { 
              ...updates.$set, 
              [`lineItems.${i}.description`]: lineItem.name 
            };
          }
        }
      }

      if (needsMigration) {
        try {
          await Claim.findByIdAndUpdate(claim._id, updates);
          migratedCount++;
          console.log(`✅ Migrated claim ${claim._id}`);
        } catch (error) {
          console.error(`❌ Failed to migrate claim ${claim._id}:`, error.message);
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Migrated: ${migratedCount} claims`);
    console.log(`⏭️  Skipped: ${skippedCount} claims (already in correct format)`);
    console.log(`📋 Total: ${allClaims.length} claims`);

    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrateClaims();
