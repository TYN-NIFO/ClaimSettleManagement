import { body, param, query, validationResult } from 'express-validator';

// Helper function to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Authentication validation
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// User creation/update validation
export const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('role')
    .optional()
    .isIn(['employee', 'supervisor', 'finance_manager', 'admin'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('supervisorLevel')
    .optional()
    .isInt({ min: 1, max: 2 })
    .withMessage('Supervisor level must be 1 or 2'),
  handleValidationErrors
];

// Claim validation
export const validateClaim = [
  body('businessUnit')
    .isIn(['Alliance', 'Coinnovation', 'General'])
    .withMessage('Invalid business unit'),
  body('category')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category is required and must be less than 100 characters'),
  body('lineItems')
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),
  body('lineItems.*.date')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('lineItems.*.subCategory')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sub-category is required and must be less than 100 characters'),
  body('lineItems.*.description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('lineItems.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('lineItems.*.currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR'])
    .withMessage('Invalid currency'),
  body('lineItems.*.gstTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('GST must be a non-negative number'),
  handleValidationErrors
];

// Claim approval validation
export const validateClaimApproval = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors
];

// File upload validation
export const validateFileUpload = [
  body('file')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('File is required');
      }
      
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (req.file.size > maxSize) {
        throw new Error('File size must be less than 50MB');
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error('Invalid file type. Allowed types: JPEG, PNG, GIF, PDF, DOC, DOCX');
      }
      
      return true;
    }),
  handleValidationErrors
];

// ID parameter validation
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Search validation
export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),
  handleValidationErrors
];

// Date range validation
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('startDate')
    .custom((value, { req }) => {
      if (value && req.query.endDate) {
        const startDate = new Date(value);
        const endDate = new Date(req.query.endDate);
        if (startDate > endDate) {
          throw new Error('Start date cannot be after end date');
        }
      }
      return true;
    }),
  handleValidationErrors
];

// Generic validation request handler
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    // Validate each field in the schema
    Object.keys(schema).forEach(field => {
      const fieldSchema = schema[field];
      const value = req[fieldSchema.in]?.[field];
      
      // Check if field is required
      if (fieldSchema.notEmpty && (!value || value === '')) {
        errors.push({
          path: field,
          msg: fieldSchema.notEmpty.errorMessage || `${field} is required`,
          value: value
        });
        return;
      }
      
      // Skip validation if field is optional and not provided
      if (fieldSchema.optional && (!value || value === '')) {
        return;
      }
      
      // Validate field based on schema rules
      if (value !== undefined && value !== null && value !== '') {
        // Check isIn validation
        if (fieldSchema.isIn && !fieldSchema.isIn.options.includes(value)) {
          errors.push({
            path: field,
            msg: fieldSchema.isIn.errorMessage || `Invalid ${field}`,
            value: value
          });
        }
        
        // Check isISO8601 validation - accept both YYYY-MM-DD and ISO8601 formats
        if (fieldSchema.isISO8601) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              path: field,
              msg: fieldSchema.isISO8601.errorMessage || `Invalid date format for ${field}`,
              value: value
            });
          }
        }
        
        // Check isFloat validation
        if (fieldSchema.isFloat) {
          const num = parseFloat(value);
          if (isNaN(num)) {
            errors.push({
              path: field,
              msg: fieldSchema.isFloat.errorMessage || `${field} must be a valid number`,
              value: value
            });
          } else {
            const options = fieldSchema.isFloat.options || {};
            if (options.min !== undefined && num < options.min) {
              errors.push({
                path: field,
                msg: fieldSchema.isFloat.errorMessage || `${field} must be at least ${options.min}`,
                value: value
              });
            }
            if (options.max !== undefined && num > options.max) {
              errors.push({
                path: field,
                msg: fieldSchema.isFloat.errorMessage || `${field} must be at most ${options.max}`,
                value: value
              });
            }
          }
        }
        
        // Check isLength validation
        if (fieldSchema.isLength) {
          const options = fieldSchema.isLength.options || {};
          if (options.min !== undefined && value.length < options.min) {
            errors.push({
              path: field,
              msg: fieldSchema.isLength.errorMessage || `${field} must be at least ${options.min} characters`,
              value: value
            });
          }
          if (options.max !== undefined && value.length > options.max) {
            errors.push({
              path: field,
              msg: fieldSchema.isLength.errorMessage || `${field} must be at most ${options.max} characters`,
              value: value
            });
          }
        }
        
        // Check isInt validation
        if (fieldSchema.isInt) {
          const num = parseInt(value);
          if (isNaN(num) || !Number.isInteger(num)) {
            errors.push({
              path: field,
              msg: fieldSchema.isInt.errorMessage || `${field} must be a valid integer`,
              value: value
            });
          } else {
            const options = fieldSchema.isInt.options || {};
            if (options.min !== undefined && num < options.min) {
              errors.push({
                path: field,
                msg: fieldSchema.isInt.errorMessage || `${field} must be at least ${options.min}`,
                value: value
              });
            }
            if (options.max !== undefined && num > options.max) {
              errors.push({
                path: field,
                msg: fieldSchema.isInt.errorMessage || `${field} must be at most ${options.max}`,
                value: value
              });
            }
          }
        }
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};