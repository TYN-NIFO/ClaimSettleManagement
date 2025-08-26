import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { validCategories, validBusinessUnits } from './lib/categoryMaster.js';

dotenv.config();

console.log('=== DEBUGGING VALIDATION ===');

const claimData = {
  "businessUnit": "General",
  "category": "IT & Software"
};

console.log('\n1. Claim Data:');
console.log('Category:', JSON.stringify(claimData.category));
console.log('Business Unit:', JSON.stringify(claimData.businessUnit));

console.log('\n2. Valid Categories from categoryMaster:');
validCategories.forEach((cat, index) => {
  console.log(`${index}: ${JSON.stringify(cat)}`);
});

console.log('\n3. Valid Business Units from categoryMaster:');
validBusinessUnits.forEach((unit, index) => {
  console.log(`${index}: ${JSON.stringify(unit)}`);
});

console.log('\n4. Validation Results:');
console.log('Category valid:', validCategories.includes(claimData.category));
console.log('Business Unit valid:', validBusinessUnits.includes(claimData.businessUnit));

console.log('\n5. Character Analysis:');
console.log('Category length:', claimData.category.length);
console.log('Category char codes:', [...claimData.category].map(c => c.charCodeAt(0)));

const matchingCategory = validCategories.find(cat => cat === claimData.category);
console.log('Exact match found:', !!matchingCategory);

if (matchingCategory) {
  console.log('Matching category char codes:', [...matchingCategory].map(c => c.charCodeAt(0)));
}

process.exit(0);