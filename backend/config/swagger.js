import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Claim Management System API",
      version: "1.0.0",
      description: "API documentation for the Claim Management System - User Authentication and Management",
      contact: {
        name: "API Support",
        email: "support@claimmanagement.com"
      }
    },
    servers: [
      {
        url: "http://localhost:5000/api",
        description: "Development server"
      },
      {
        url: "https://your-production-url.com/api",
        description: "Production server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token in the format: Bearer <token>"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Unique identifier for the user",
              example: "507f1f77bcf86cd799439011"
            },
            firstName: {
              type: "string",
              description: "User's first name",
              example: "John"
            },
            lastName: {
              type: "string", 
              description: "User's last name",
              example: "Doe"
            },
            name: {
              type: "string",
              description: "User's full name",
              example: "John Doe"
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
              example: "john.doe@company.com"
            },
            role: {
              type: "string",
              enum: ["employee", "supervisor", "finance_manager", "admin"],
              description: "User's role in the system",
              example: "employee"
            },
            supervisorLevel: {
              type: "number",
              minimum: 1,
              maximum: 2,
              nullable: true,
              description: "Supervisor level (1 or 2), null for non-supervisors",
              example: 1
            },
            isActive: {
              type: "boolean",
              description: "Whether the user account is active",
              example: true
            },
            assignedSupervisor1: {
              type: "string",
              nullable: true,
              description: "ID of assigned level 1 supervisor",
              example: "507f1f77bcf86cd799439012"
            },
            assignedSupervisor2: {
              type: "string",
              nullable: true,
              description: "ID of assigned level 2 supervisor", 
              example: "507f1f77bcf86cd799439013"
            },
            department: {
              type: "string",
              description: "User's department",
              example: "Engineering"
            },
            companyName: {
              type: "string",
              description: "Company name",
              example: "Tech Corp"
            },
            companyUrl: {
              type: "string",
              description: "Company website URL",
              example: "https://techcorp.com"
            },
            avatarUrl: {
              type: "string",
              description: "URL to user's profile picture",
              example: "https://example.com/avatar.jpg"
            },
            lastLoginAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Last login timestamp",
              example: "2024-01-15T10:30:00Z"
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
              example: "2024-01-01T00:00:00Z"
            },
            updatedAt: {
              type: "string",
              format: "date-time", 
              description: "Last update timestamp",
              example: "2024-01-15T10:30:00Z"
            }
          },
          required: ["_id", "name", "email", "role", "isActive", "createdAt", "updatedAt"]
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
              example: "john.doe@company.com"
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User's password",
              example: "password123"
            }
          }
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            firstName: {
              type: "string",
              description: "User's first name",
              example: "John"
            },
            lastName: {
              type: "string",
              description: "User's last name",
              example: "Doe"
            },
            name: {
              type: "string",
              description: "User's full name",
              example: "John Doe"
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
              example: "john.doe@company.com"
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User's password",
              example: "password123"
            },
            role: {
              type: "string",
              enum: ["employee", "supervisor", "finance_manager", "admin"],
              description: "User's role in the system",
              example: "employee"
            },
            department: {
              type: "string",
              description: "User's department",
              example: "Engineering"
            },
            companyName: {
              type: "string",
              description: "Company name",
              example: "Tech Corp"
            },
            companyUrl: {
              type: "string",
              description: "Company website URL",
              example: "https://techcorp.com"
            }
          }
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Whether the authentication was successful",
              example: true
            },
            message: {
              type: "string",
              description: "Response message",
              example: "Login successful"
            },
            token: {
              type: "string",
              description: "JWT access token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            refreshToken: {
              type: "string",
              description: "JWT refresh token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            user: {
              $ref: "#/components/schemas/User"
            }
          }
        },
        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              description: "Valid refresh token",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Always false for error responses",
              example: false
            },
            error: {
              type: "string",
              description: "Error message",
              example: "Invalid credentials"
            },
            message: {
              type: "string",
              description: "Detailed error message",
              example: "The provided email or password is incorrect"
            },
            details: {
              type: "object",
              description: "Additional error details",
              example: {
                field: "email",
                code: "INVALID_FORMAT"
              }
            }
          }
        },
        ValidationError: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false
            },
            error: {
              type: "string",
              example: "Validation failed"
            },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: {
                    type: "string",
                    example: "email"
                  },
                  message: {
                    type: "string",
                    example: "Email is required"
                  }
                }
              }
            }
          }
        },
        Attachment: {
          type: "object",
          properties: {
            fileId: {
              type: "string",
              description: "Unique file identifier",
              example: "abc123def456"
            },
            name: {
              type: "string",
              description: "Original filename",
              example: "receipt.pdf"
            },
            size: {
              type: "number",
              description: "File size in bytes",
              example: 1024000
            },
            mime: {
              type: "string",
              description: "MIME type of the file",
              example: "application/pdf"
            },
            storageKey: {
              type: "string",
              description: "Storage key for file retrieval",
              example: "507f1f77bcf86cd799439011.pdf"
            },
            label: {
              type: "string",
              description: "Label for document type",
              example: "receipt"
            }
          }
        },
        LineItem: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Line item ID",
              example: "507f1f77bcf86cd799439011"
            },
            date: {
              type: "string",
              format: "date",
              description: "Expense date",
              example: "2024-01-15"
            },
            subCategory: {
              type: "string",
              description: "Expense subcategory",
              example: "Meals"
            },
            description: {
              type: "string",
              description: "Expense description",
              example: "Business lunch with client"
            },
            currency: {
              type: "string",
              enum: ["INR", "USD", "EUR"],
              description: "Currency code",
              example: "INR"
            },
            amount: {
              type: "number",
              description: "Expense amount",
              example: 1500.00
            },
            gstTotal: {
              type: "number",
              description: "GST amount",
              example: 270.00
            },
            amountInINR: {
              type: "number",
              description: "Amount converted to INR",
              example: 1770.00
            },
            attachments: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Attachment"
              },
              description: "File attachments for this line item"
            }
          },
          required: ["date", "subCategory", "description", "amount", "amountInINR"]
        },
        Claim: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Claim ID",
              example: "507f1f77bcf86cd799439011"
            },
            employeeId: {
              type: "string",
              description: "Employee ID who owns the claim",
              example: "507f1f77bcf86cd799439012"
            },
            createdBy: {
              type: "string",
              description: "User ID who created the claim",
              example: "507f1f77bcf86cd799439012"
            },
            businessUnit: {
              type: "string",
              enum: ["Alliance", "Coinnovation", "General"],
              description: "Business unit",
              example: "Alliance"
            },
            category: {
              type: "string",
              description: "Claim category",
              example: "Travel"
            },
            lineItems: {
              type: "array",
              items: {
                $ref: "#/components/schemas/LineItem"
              },
              description: "Expense line items"
            },
            totalsByHead: {
              type: "object",
              description: "Totals grouped by expense category",
              example: {
                "Meals": 1500.00,
                "Transport": 2000.00
              }
            },
            grandTotal: {
              type: "number",
              description: "Total claim amount",
              example: 3500.00
            },
            netPayable: {
              type: "number",
              description: "Net amount payable after deductions",
              example: 3500.00
            },
            status: {
              type: "string",
              enum: ["submitted", "approved", "rejected", "finance_approved", "paid"],
              description: "Claim status",
              example: "submitted"
            },
            policyVersion: {
              type: "string",
              description: "Policy version used for validation",
              example: "1.0.0"
            },
            violations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                    example: "AMOUNT_EXCEEDED"
                  },
                  message: {
                    type: "string",
                    example: "Amount exceeds policy limit"
                  },
                  level: {
                    type: "string",
                    enum: ["warn", "error"],
                    example: "warn"
                  }
                }
              }
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
              example: "2024-01-01T00:00:00Z"
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
              example: "2024-01-15T10:30:00Z"
            }
          },
          required: ["employeeId", "createdBy", "businessUnit", "category"]
        },
        ClaimRequest: {
          type: "object",
          properties: {
            businessUnit: {
              type: "string",
              enum: ["Alliance", "Coinnovation", "General"],
              description: "Business unit",
              example: "Alliance"
            },
            category: {
              type: "string",
              description: "Claim category",
              example: "Travel"
            },
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    format: "date",
                    example: "2024-01-15"
                  },
                  subCategory: {
                    type: "string",
                    example: "Meals"
                  },
                  description: {
                    type: "string",
                    example: "Business lunch"
                  },
                  currency: {
                    type: "string",
                    enum: ["INR", "USD", "EUR"],
                    example: "INR"
                  },
                  amount: {
                    type: "number",
                    example: 1500.00
                  },
                  gstTotal: {
                    type: "number",
                    example: 270.00
                  }
                },
                required: ["date", "subCategory", "description", "amount"]
              }
            }
          },
          required: ["businessUnit", "category", "lineItems"]
        },
        Policy: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Policy ID",
              example: "507f1f77bcf86cd799439011"
            },
            version: {
              type: "string",
              description: "Policy version",
              example: "1.0.0"
            },
            isActive: {
              type: "boolean",
              description: "Whether policy is active",
              example: true
            },
            claimCategories: {
              type: "object",
              description: "Available claim categories and subcategories",
              example: {
                "Travel": ["Flights", "Hotels", "Meals", "Transport"],
                "Office": ["Supplies", "Equipment"]
              }
            },
            limits: {
              type: "object",
              description: "Spending limits by category",
              example: {
                "Travel.Meals": {
                  "daily": 2000,
                  "monthly": 50000
                }
              }
            },
            maxFileSizeMB: {
              type: "number",
              description: "Maximum file size in MB",
              example: 10
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2024-01-01T00:00:00Z"
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/authRoutes.js'),
    path.join(__dirname, '../routes/userRoutes.js'),
    path.join(__dirname, '../routes/claimRoutes.js'),
    path.join(__dirname, '../routes/policyRoutes.js')
  ]
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;