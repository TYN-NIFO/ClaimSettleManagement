import Policy from '../models/Policy.js';

/**
 * Validate a claim against the current policy
 * @param {Object} claim - The claim object to validate
 * @param {Object} policy - The policy object to validate against
 * @returns {Array} Array of violations
 */
export const validateAgainstPolicy = (claim, policy) => {
  const violations = [];

  // Check for missing required documents
  violations.push(...validateRequiredDocuments(claim, policy));

  // Check for cap violations
  violations.push(...validateCaps(claim, policy));

  // Validate mileage calculations
  violations.push(...validateMileageCalculations(claim, policy));

  return violations;
};

/**
 * Validate required documents for each line item
 */
const validateRequiredDocuments = (claim, policy) => {
  const violations = [];

  claim.lineItems.forEach((lineItem, index) => {
    const requiredDocs = policy.requiredDocuments[lineItem.type] || [];
    const attachedLabels = lineItem.attachments.map(att => att.label).filter(Boolean);
    
    const missingDocs = requiredDocs.filter(doc => !attachedLabels.includes(doc));
    
    if (missingDocs.length > 0) {
      violations.push({
        code: 'missing_docs',
        message: `Line ${index + 1} (${lineItem.type}): Missing required documents: ${missingDocs.join(', ')}`,
        level: policy.rulesBehavior.missingDocuments === 'hard' ? 'error' : 'warn',
        lineIndex: index,
        missingDocuments: missingDocs
      });
    }
  });

  return violations;
};

/**
 * Validate meal and lodging caps against city class
 */
const validateCaps = (claim, policy) => {
  const violations = [];
  const cityClass = claim.trip?.cityClass || 'C'; // Default to C class

  claim.lineItems.forEach((lineItem, index) => {
    if (lineItem.type === 'meal') {
      const mealCap = policy.mealCaps[cityClass]?.[lineItem.mealType];
      if (mealCap && lineItem.amount > mealCap) {
        violations.push({
          code: 'cap_exceeded',
          message: `Line ${index + 1} (${lineItem.mealType}): Amount ₹${lineItem.amount} exceeds cap of ₹${mealCap} for city class ${cityClass}`,
          level: policy.rulesBehavior.capExceeded === 'hard' ? 'error' : 'warn',
          lineIndex: index,
          actualAmount: lineItem.amount,
          capAmount: mealCap
        });
      }
    }

    if (lineItem.type === 'lodging') {
      const lodgingCap = policy.lodgingCaps[cityClass];
      if (lodgingCap && lineItem.amount > lodgingCap) {
        violations.push({
          code: 'cap_exceeded',
          message: `Line ${index + 1} (lodging): Amount ₹${lineItem.amount} exceeds cap of ₹${lodgingCap} for city class ${cityClass}`,
          level: policy.rulesBehavior.capExceeded === 'hard' ? 'error' : 'warn',
          lineIndex: index,
          actualAmount: lineItem.amount,
          capAmount: lodgingCap
        });
      }
    }
  });

  return violations;
};

/**
 * Validate mileage calculations
 */
const validateMileageCalculations = (claim, policy) => {
  const violations = [];

  claim.lineItems.forEach((lineItem, index) => {
    if (lineItem.type === 'mileage') {
      const expectedAmount = lineItem.kilometers * policy.mileageRate;
      const tolerance = 0.01; // Allow for small rounding differences
      
      if (Math.abs(lineItem.amount - expectedAmount) > tolerance) {
        violations.push({
          code: 'mileage_calc',
          message: `Line ${index + 1} (mileage): Amount ₹${lineItem.amount} should be ₹${expectedAmount} (${lineItem.kilometers}km × ₹${policy.mileageRate}/km)`,
          level: 'error',
          lineIndex: index,
          actualAmount: lineItem.amount,
          expectedAmount: expectedAmount,
          kilometers: lineItem.kilometers,
          rate: policy.mileageRate
        });
      }
    }
  });

  return violations;
};

/**
 * Compute totals for a claim
 */
export const computeClaimTotals = (claim) => {
  const totalsByHead = {};
  let grandTotal = 0;

  // Calculate totals by account head
  claim.lineItems.forEach(lineItem => {
    const head = getAccountHeadForLineType(lineItem.type);
    totalsByHead[head] = (totalsByHead[head] || 0) + lineItem.amount;
    grandTotal += lineItem.amount;
  });

  // Calculate advances total
  const advancesTotal = claim.advances.reduce((sum, advance) => sum + advance.amount, 0);
  const netPayable = grandTotal - advancesTotal;

  return {
    totalsByHead,
    grandTotal,
    advancesTotal,
    netPayable
  };
};

/**
 * Get account head for line item type
 */
const getAccountHeadForLineType = (lineType) => {
  const headMapping = {
    flight: 'Business Travel',
    train: 'Business Travel',
    local_travel: 'Business Travel',
    mileage: 'Fuel',
    meal: 'Business Travel',
    lodging: 'Business Travel',
    client_entertainment: 'Business Promotion',
    admin_misc: 'Admin Exp'
  };

  return headMapping[lineType] || 'Admin Exp';
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

  return await defaultPolicy.save();
};
