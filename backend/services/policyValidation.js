import Policy from '../models/Policy.js';

/**
 * Validate claim against current policy
 */
export const validateAgainstPolicy = async (claimData, policy) => {
  const violations = [];
  
  try {
    // Validate line items
    if (claimData.lineItems && Array.isArray(claimData.lineItems)) {
      for (const lineItem of claimData.lineItems) {
        // GST validation for flight travel
        if (lineItem.subCategory && lineItem.subCategory.toLowerCase().includes('flight')) {
          if (!lineItem.gstTotal || lineItem.gstTotal <= 0) {
            violations.push({
              code: 'GST_REQUIRED',
              message: 'GST is mandatory for flight travel expenses',
              level: 'error',
              field: 'gstTotal',
              lineItemId: lineItem._id
            });
          }
        }
        
        // Optional GST validation for other categories
        if (lineItem.subCategory && 
            !lineItem.subCategory.toLowerCase().includes('flight') && 
            lineItem.gstTotal && lineItem.gstTotal > 0) {
          // GST is provided but not required - this is fine, just log it
          console.log(`GST provided for non-flight category: ${lineItem.subCategory}`);
        }
        
        // Validate amount
        if (!lineItem.amount || lineItem.amount <= 0) {
          violations.push({
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than 0',
            level: 'error',
            field: 'amount',
            lineItemId: lineItem._id
          });
        }
        
        // Validate description
        if (!lineItem.description || lineItem.description.trim().length < 10) {
          violations.push({
            code: 'INVALID_DESCRIPTION',
            message: 'Description must be at least 10 characters',
            level: 'error',
            field: 'description',
            lineItemId: lineItem._id
          });
        }
      }
    }
    
    // Validate category
    if (!claimData.category || !policy.claimCategories.includes(claimData.category)) {
      violations.push({
        code: 'INVALID_CATEGORY',
        message: `Category must be one of: ${policy.claimCategories.join(', ')}`,
        level: 'error',
        field: 'category'
      });
    }
    
    // Validate business unit
    const validBusinessUnits = ['Alliance', 'Coinnovation', 'General'];
    if (!claimData.businessUnit || !validBusinessUnits.includes(claimData.businessUnit)) {
      violations.push({
        code: 'INVALID_BUSINESS_UNIT',
        message: `Business unit must be one of: ${validBusinessUnits.join(', ')}`,
        level: 'error',
        field: 'businessUnit'
      });
    }
    
    // Validate total amount
    if (claimData.grandTotal && claimData.grandTotal > policy.maxAmountBeforeFinanceManager) {
      violations.push({
        code: 'AMOUNT_EXCEEDS_LIMIT',
        message: `Amount exceeds limit of ₹${policy.maxAmountBeforeFinanceManager.toLocaleString()}`,
        level: 'warn',
        field: 'grandTotal'
      });
    }
    
    return {
      isValid: violations.filter(v => v.level === 'error').length === 0,
      violations
    };
  } catch (error) {
    console.error('Policy validation error:', error);
    violations.push({
      code: 'VALIDATION_ERROR',
      message: 'Error during validation',
      level: 'error'
    });
    
    return {
      isValid: false,
      violations
    };
  }
};

/**
 * Compute totals for a claim
 */
export const computeClaimTotals = async (claimData, policy) => {
  try {
    let grandTotal = 0;
    let totalsByHead = {};
    
    // Calculate totals from line items
    if (claimData.lineItems && Array.isArray(claimData.lineItems)) {
      for (const lineItem of claimData.lineItems) {
        const amount = lineItem.amountInINR || lineItem.amount || 0;
        grandTotal += amount;
        
        // Group by category
        const category = lineItem.subCategory || 'Other';
        if (!totalsByHead[category]) {
          totalsByHead[category] = 0;
        }
        totalsByHead[category] += amount;
      }
    }
    
    // Subtract advances
    let advancesTotal = 0;
    if (claimData.advances && Array.isArray(claimData.advances)) {
      advancesTotal = claimData.advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
    }
    
    const netPayable = grandTotal - advancesTotal;
    
    return {
      grandTotal,
      advancesTotal,
      netPayable,
      totalsByHead
    };
  } catch (error) {
    console.error('Error computing claim totals:', error);
    return {
      grandTotal: 0,
      advancesTotal: 0,
      netPayable: 0,
      totalsByHead: {}
    };
  }
};

/**
 * Get current policy
 */
export const getCurrentPolicy = async () => {
  try {
    let policy = await Policy.findOne().sort({ createdAt: -1 });
    
    if (!policy) {
      // Create default policy if none exists
      policy = new Policy({
        approvalMode: 'both',
        claimCategories: ['Travel', 'Healthcare', 'Office', 'Training', 'Other'],
        maxAmountBeforeFinanceManager: 10000,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSizeMB: 10,
        payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
        autoAssignSupervisors: false,
        claimRetentionDays: 365
      });
      await policy.save();
    }
    
    return policy;
  } catch (error) {
    console.error('Error getting current policy:', error);
    return null;
  }
};

/**
 * Create default policy if none exists
 */
export const createDefaultPolicy = async () => {
  try {
    const policy = new Policy({
      approvalMode: 'both',
      claimCategories: ['Travel', 'Healthcare', 'Office', 'Training', 'Other'],
      maxAmountBeforeFinanceManager: 10000,
      allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      maxFileSizeMB: 10,
      payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
      autoAssignSupervisors: false,
      claimRetentionDays: 365
    });
    
    await policy.save();
    return policy;
  } catch (error) {
    console.error('Error creating default policy:', error);
    throw error;
  }
};

// Validate file upload
export const validateFileUpload = (file, policy) => {
  const violations = [];
  
  try {
    // Check file type
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (!policy.allowedFileTypes.includes(fileExtension)) {
      violations.push({
        code: 'INVALID_FILE_TYPE',
        message: `File type not allowed. Allowed types: ${policy.allowedFileTypes.join(', ')}`,
        level: 'error'
      });
    }
    
    // Check file size
    const maxSizeBytes = (policy.maxFileSizeMB || 10) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      violations.push({
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds limit of ${policy.maxFileSizeMB || 10}MB`,
        level: 'error'
      });
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  } catch (error) {
    console.error('File validation error:', error);
    violations.push({
      code: 'VALIDATION_ERROR',
      message: 'Error during file validation',
      level: 'error'
    });
    
    return {
      isValid: false,
      violations
    };
  }
};
