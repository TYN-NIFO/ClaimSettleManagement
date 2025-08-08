import mongoose from 'mongoose';

const PolicySchema = new mongoose.Schema({
  version: { 
    type: String, 
    required: true 
  },
  mileageRate: { 
    type: Number, 
    default: 12 
  }, // ₹/km
  cityClasses: { 
    type: [String], 
    default: ["A", "B", "C"] 
  },
  mealCaps: { // per city class
    type: mongoose.Schema.Types.Mixed, // { A: { breakfast: 150, lunch: 300, dinner: 400, snack: 100 }, ... }
    required: true
  },
  lodgingCaps: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  }, // { A: 3500, B: 2500, C: 1800 }
  requiredDocuments: { // per line type
    type: mongoose.Schema.Types.Mixed, // { flight: ["airline_invoice","mmt_invoice"], train:["ticket","payment_proof"], ... }
    required: true
  },
  adminSubCategories: { 
    type: [String], 
    default: ["printout", "repairs", "filing", "others"] 
  },
  rulesBehavior: { // "hard" blocks submit; "soft" allows with override
    missingDocuments: { 
      type: String, 
      default: "hard" 
    },
    capExceeded: { 
      type: String, 
      default: "soft" 
    }
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Policy', PolicySchema);
