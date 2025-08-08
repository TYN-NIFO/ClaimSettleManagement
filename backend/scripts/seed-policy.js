import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Policy from '../models/Policy.js';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/claims');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedPolicy = async () => {
  try {
    await connectDB();

    // Check if policy already exists
    const existingPolicy = await Policy.findOne();
    if (existingPolicy) {
      console.log('Policy already exists. Skipping seed.');
      process.exit(0);
    }

    // Create default policy
    const defaultPolicy = new Policy({
      version: 'v1.0',
      mileageRate: 12,
      cityClasses: ['A', 'B', 'C'],
      mealCaps: {
        A: { breakfast: 200, lunch: 350, dinner: 500, snack: 150 },
        B: { breakfast: 150, lunch: 300, dinner: 400, snack: 120 },
        C: { breakfast: 120, lunch: 250, dinner: 350, snack: 100 }
      },
      lodgingCaps: { A: 4000, B: 3000, C: 2000 },
      requiredDocuments: {
        flight: ['airline_invoice', 'mmt_invoice'],
        train: ['ticket', 'payment_proof'],
        local_travel: ['receipt_or_reason'],
        meal: ['restaurant_bill'],
        lodging: ['hotel_invoice'],
        client_entertainment: ['bill_or_proof'],
        mileage: ['route_or_log'],
        admin_misc: ['supporting_doc']
      },
      adminSubCategories: ['printout', 'repairs', 'filing', 'others'],
      rulesBehavior: { 
        missingDocuments: 'hard', 
        capExceeded: 'soft' 
      }
    });

    await defaultPolicy.save();
    console.log('✅ Default policy created successfully!');
    console.log('Policy ID:', defaultPolicy._id);
    console.log('Version:', defaultPolicy.version);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding policy:', error);
    process.exit(1);
  }
};

// Run the seed function
seedPolicy();
