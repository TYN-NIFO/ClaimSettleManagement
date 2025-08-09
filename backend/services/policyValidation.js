import Policy from '../models/Policy.js';

/**
 * Validate claim against current policy
 */
export const validateAgainstPolicy = (claim, policy) => {
  const violations = [];

  // Basic validation
  if (!claim.lineItems || claim.lineItems.length === 0) {
    violations.push({
      code: 'NO_LINE_ITEMS',
      message: 'At least one line item is required',
      level: 'error'
    });
  }

  // Validate line items
  claim.lineItems.forEach((lineItem, index) => {
    if (!lineItem.description || lineItem.description.trim() === '') {
      violations.push({
        code: 'MISSING_DESCRIPTION',
        message: `Line item ${index + 1} must have a description`,
        level: 'error'
      });
    }

    if (!lineItem.subCategory || lineItem.subCategory.trim() === '') {
      violations.push({
        code: 'MISSING_SUBCATEGORY',
        message: `Line item ${index + 1} must have a sub-category`,
        level: 'error'
      });
    }

    if (!lineItem.amount || lineItem.amount <= 0) {
      violations.push({
        code: 'INVALID_AMOUNT',
        message: `Line item ${index + 1} must have a valid amount`,
        level: 'error'
      });
    }

    if (lineItem.gstTotal < 0) {
      violations.push({
        code: 'INVALID_GST',
        message: `Line item ${index + 1} GST total cannot be negative`,
        level: 'error'
      });
    }

    // Validate that total (amount + gst) is positive
    const total = (lineItem.amount || 0) + (lineItem.gstTotal || 0);
    if (total <= 0) {
      violations.push({
        code: 'INVALID_TOTAL',
        message: `Line item ${index + 1} total (amount + GST) must be positive`,
        level: 'error'
      });
    }
  });

  // Validate advances
  claim.advances.forEach((advance, index) => {
    if (!advance.date) {
      violations.push({
        code: 'MISSING_ADVANCE_DATE',
        message: `Advance ${index + 1} must have a date`,
        level: 'error'
      });
    }

    if (!advance.amount || advance.amount <= 0) {
      violations.push({
        code: 'INVALID_ADVANCE_AMOUNT',
        message: `Advance ${index + 1} must have a valid amount`,
        level: 'error'
      });
    }
  });

  return violations;
};

/**
 * Compute totals for a claim
 */
export const computeClaimTotals = (claim) => {
  let grandTotal = 0;

  // Calculate totals using amountInINR
  claim.lineItems.forEach(lineItem => {
    grandTotal += lineItem.amountInINR || 0;
  });

  // Calculate advances total
  const advancesTotal = claim.advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
  const netPayable = grandTotal - advancesTotal;

  return {
    totalsByHead: {}, // Simplified - no account head breakdown
    grandTotal,
    advancesTotal,
    netPayable
  };
};

/**
 * Get current policy
 */
export const getCurrentPolicy = async () => {
  const policy = await Policy.findOne().sort({ createdAt: -1 });
  if (!policy) {
    throw new Error('No policy found. Please create a policy first.');
  }
  return policy;
};

/**
 * Create default policy if none exists
 */
export const createDefaultPolicy = async () => {
  const existingPolicy = await Policy.findOne();
  if (existingPolicy) {
    return existingPolicy;
  }

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
      default: ['supporting_doc']
    },
    adminSubCategories: ['printout', 'repairs', 'filing', 'others'],
    rulesBehavior: { 
      missingDocuments: 'hard', 
      capExceeded: 'soft' 
    }
  });

  return await defaultPolicy.save();
};
