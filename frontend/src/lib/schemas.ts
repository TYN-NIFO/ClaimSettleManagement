import { z } from 'zod';
import { categoryMaster, businessUnits, lineItemTypes as categoryLineItemTypes, mealTypes as categoryMealTypes, travelModes as categoryTravelModes, cityClasses as categoryCityClasses } from './categoryMaster';

// Base line item schema
const lineItemBase = z.object({
  name: z.string().min(1, 'Name is required'),
  date: z.date(),
  description: z.string().optional(),
  currency: z.enum(['INR', 'USD', 'EUR']),
  amount: z.number().positive('Amount must be positive'),
  gstTotal: z.number().min(0, 'GST total must be non-negative'),
  amountInINR: z.number().positive('Amount in INR is required'),
  notes: z.string().optional(),
  type: z.string()
});

// Flight line item
const flightLineItem = lineItemBase.extend({
  type: z.literal('flight'),
  from: z.string().min(1, 'From is required'),
  to: z.string().min(1, 'To is required'),
  airline: z.string().min(1, 'Airline is required'),
  pnr: z.string().optional(),
  invoiceNo: z.string().optional()
});

// Train/Bus line item
const trainBusLineItem = lineItemBase.extend({
  type: z.literal('train_bus'),
  from: z.string().min(1, 'From is required'),
  to: z.string().min(1, 'To is required'),
  trainNo: z.string().optional(),
  class: z.string().optional()
});

// Local travel line item
const localTravelLineItem = lineItemBase.extend({
  type: z.literal('local_travel'),
  mode: z.enum(categoryTravelModes as [string, ...string[]]),
  from: z.string().optional(),
  to: z.string().optional()
});

// Mileage line item
const mileageLineItem = lineItemBase.extend({
  type: z.literal('mileage'),
  kilometers: z.number().positive('Kilometers must be positive'),
  amount: z.number().positive('Amount must be positive')
});

// Meal travel line item
const mealTravelLineItem = lineItemBase.extend({
  type: z.literal('meal_travel'),
  mealType: z.enum(categoryMealTypes as [string, ...string[]]),
  city: z.string().optional()
});

// Lodging line item
const lodgingLineItem = lineItemBase.extend({
  type: z.literal('lodging'),
  checkIn: z.date(),
  checkOut: z.date(),
  nights: z.number().positive('Nights must be positive'),
  city: z.string().min(1, 'City is required'),
  gst: z.object({
    gstin: z.string().optional(),
    taxBreakup: z.object({
      cgst: z.number().optional(),
      sgst: z.number().optional(),
      igst: z.number().optional()
    }).optional()
  }).optional()
});

// Client entertainment line item
const clientEntertainmentLineItem = lineItemBase.extend({
  type: z.literal('client_entertainment'),
  attendeeCount: z.number().positive('Attendee count must be positive').optional(),
  customer: z.string().optional()
});

// Team meal line item
const teamMealLineItem = lineItemBase.extend({
  type: z.literal('team_meal'),
  attendeeCount: z.number().positive('Attendee count must be positive').optional()
});

// Admin misc line item
const adminMiscLineItem = lineItemBase.extend({
  type: z.literal('admin_misc'),
  subCategory: z.string().min(1, 'Sub-category is required')
});

// Union of all line item types
export const lineItemSchema = z.discriminatedUnion('type', [
  flightLineItem,
  trainBusLineItem,
  localTravelLineItem,
  mileageLineItem,
  mealTravelLineItem,
  lodgingLineItem,
  clientEntertainmentLineItem,
  teamMealLineItem,
  adminMiscLineItem
]);

// Advance schema
export const advanceSchema = z.object({
  date: z.date(),
  refNo: z.string().optional(),
  amount: z.number().positive('Amount must be positive')
});

// Trip schema
export const tripSchema = z.object({
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  purpose: z.string().optional(),
  costCenter: z.string().optional(),
  project: z.string().optional(),
  cityClass: z.enum(categoryCityClasses as [string, ...string[]]).optional()
});

// GST schema
export const gstSchema = z.object({
  gstin: z.string().optional(),
  taxBreakup: z.object({
    cgst: z.number().optional(),
    sgst: z.number().optional(),
    igst: z.number().optional()
  }).optional()
});

// Attachment schema
export const attachmentSchema = z.object({
  fileId: z.string(),
  name: z.string(),
  size: z.number(),
  mime: z.string(),
  storageKey: z.string(),
  url: z.string().optional(), // Public S3 URL
  label: z.string()
});

// Line item with attachments - create a union of all line item types with attachments
export const lineItemWithAttachmentsSchema = z.discriminatedUnion('type', [
  flightLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  trainBusLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  localTravelLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  mileageLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  mealTravelLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  lodgingLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  clientEntertainmentLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  teamMealLineItem.extend({ attachments: z.array(attachmentSchema).default([]) }),
  adminMiscLineItem.extend({ attachments: z.array(attachmentSchema).default([]) })
]);

// Claim schema
export const claimSchema = z.object({
  businessUnit: z.enum(businessUnits as [string, ...string[]]),
  category: z.string().min(1, 'Category is required'),
  subCategories: z.array(z.string()).min(1, 'At least one sub-category is required'),
  accountHead: z.string().min(1, 'Account head is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  dateRange: z.object({
    from: z.date(),
    to: z.date()
  }).optional(),
  project: z.string().optional(),
  costCenter: z.string().optional(),
  cityClass: z.enum(categoryCityClasses as [string, ...string[]]).optional(),
  advances: z.array(advanceSchema).default([]),
  lineItems: z.array(lineItemWithAttachmentsSchema).min(1, 'At least one line item is required').max(15, 'Maximum 15 line items allowed'),
  totalsByHead: z.record(z.number()).default({}),
  grandTotal: z.number().positive('Grand total must be positive'),
  netPayable: z.number(),
  status: z.enum(['submitted', 'approved', 'rejected', 'finance_approved', 'paid']).default('submitted'),
  policyVersion: z.string().optional(),
  violations: z.array(z.object({
    code: z.string(),
    message: z.string(),
    level: z.enum(['warn', 'error'])
  })).default([])
});

// Policy schema
export const policySchema = z.object({
  cityClasses: z.array(z.string()),
  perDiemCaps: z.record(z.record(z.number())),
  lodgingCapsPerNight: z.record(z.number()),
  mileageRatePerKmINR: z.number(),
  rules: z.object({
    requiredDocs: z.record(z.array(z.string())),
    blocking: z.array(z.string()),
    warnings: z.array(z.string())
  }),
  itcFlags: z.record(z.string())
});

// File upload schema
export const fileUploadSchema = z.object({
  lineItemId: z.string(),
  files: z.array(z.instanceof(File)),
  labels: z.array(z.string())
});

// Approval schema
export const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  notes: z.string().optional()
});

// Payment schema
export const paymentSchema = z.object({
  channel: z.string().min(1, 'Payment channel is required'),
  reference: z.string().optional()
});

// Export types
export type LineItem = z.infer<typeof lineItemSchema>;
export type Advance = z.infer<typeof advanceSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Policy = z.infer<typeof policySchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type Payment = z.infer<typeof paymentSchema>;

// Export constants for backward compatibility
export const lineItemTypes = Object.keys(categoryLineItemTypes);
export const mealTypes = categoryMealTypes;
export const travelModes = categoryTravelModes;
export const cityClasses = categoryCityClasses;
export const categories = categoryMaster.map(cat => cat.name);
export const accountHeads = categoryMaster.flatMap(cat => 
  cat.subCategories.map(sub => `${cat.name} > ${sub.name}`)
);
