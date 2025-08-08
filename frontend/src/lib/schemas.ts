import { z } from 'zod';

// Base line item schema
const lineItemBase = z.object({
  date: z.date(),
  amount: z.number().positive('Amount must be positive'),
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

// Train line item
const trainLineItem = lineItemBase.extend({
  type: z.literal('train'),
  from: z.string().min(1, 'From is required'),
  to: z.string().min(1, 'To is required'),
  trainNo: z.string().optional(),
  class: z.string().optional()
});

// Local travel line item
const localTravelLineItem = lineItemBase.extend({
  type: z.literal('local_travel'),
  mode: z.enum(['auto', 'taxi', 'metro', 'bus']),
  from: z.string().optional(),
  to: z.string().optional()
});

// Mileage line item
const mileageLineItem = lineItemBase.extend({
  type: z.literal('mileage'),
  kilometers: z.number().positive('Kilometers must be positive'),
  amount: z.number().positive('Amount must be positive')
});

// Meal line item
const mealLineItem = lineItemBase.extend({
  type: z.literal('meal'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
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

// Admin misc line item
const adminMiscLineItem = lineItemBase.extend({
  type: z.literal('admin_misc'),
  subCategory: z.string().min(1, 'Sub-category is required')
});

// Union of all line item types
export const lineItemSchema = z.discriminatedUnion('type', [
  flightLineItem,
  trainLineItem,
  localTravelLineItem,
  mileageLineItem,
  mealLineItem,
  lodgingLineItem,
  clientEntertainmentLineItem,
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
  purpose: z.string().min(1, 'Purpose is required'),
  costCenter: z.string().optional(),
  project: z.string().optional(),
  cityClass: z.enum(['A', 'B', 'C']).optional()
});

// Main claim schema
export const claimSchema = z.object({
  category: z.enum(['Alliance', 'Co-Innovation', 'Tech', 'Admin Exp', 'Employee-Related Exp']),
  accountHead: z.enum(['Business Travel', 'Fuel', 'Business Promotion', 'Admin Exp', 'Training (Learning)']),
  trip: tripSchema.optional(),
  advances: z.array(advanceSchema).default([]),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required')
});

// Policy schema
export const policySchema = z.object({
  version: z.string(),
  mileageRate: z.number().positive(),
  cityClasses: z.array(z.string()),
  mealCaps: z.record(z.record(z.number())),
  lodgingCaps: z.record(z.number()),
  requiredDocuments: z.record(z.array(z.string())),
  adminSubCategories: z.array(z.string()),
  rulesBehavior: z.object({
    missingDocuments: z.enum(['hard', 'soft']),
    capExceeded: z.enum(['hard', 'soft'])
  })
});

// File upload schema
export const fileUploadSchema = z.object({
  claimId: z.string(),
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

// Types
export type LineItem = z.infer<typeof lineItemSchema>;
export type Advance = z.infer<typeof advanceSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Policy = z.infer<typeof policySchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type Approval = z.infer<typeof approvalSchema>;
export type Payment = z.infer<typeof paymentSchema>;

// Line item type options
export const lineItemTypes = [
  { value: 'flight', label: 'Flight' },
  { value: 'train', label: 'Train' },
  { value: 'local_travel', label: 'Local Travel' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'meal', label: 'Meal' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'client_entertainment', label: 'Client Entertainment' },
  { value: 'admin_misc', label: 'Admin Misc' }
] as const;

// Meal type options
export const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
] as const;

// Travel mode options
export const travelModes = [
  { value: 'auto', label: 'Auto' },
  { value: 'taxi', label: 'Taxi' },
  { value: 'metro', label: 'Metro' },
  { value: 'bus', label: 'Bus' }
] as const;

// City class options
export const cityClasses = [
  { value: 'A', label: 'Class A' },
  { value: 'B', label: 'Class B' },
  { value: 'C', label: 'Class C' }
] as const;

// Category options
export const categories = [
  { value: 'Alliance', label: 'Alliance' },
  { value: 'Co-Innovation', label: 'Co-Innovation' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Admin Exp', label: 'Admin Exp' },
  { value: 'Employee-Related Exp', label: 'Employee-Related Exp' }
] as const;

// Account head options
export const accountHeads = [
  { value: 'Business Travel', label: 'Business Travel' },
  { value: 'Fuel', label: 'Fuel' },
  { value: 'Business Promotion', label: 'Business Promotion' },
  { value: 'Admin Exp', label: 'Admin Exp' },
  { value: 'Training (Learning)', label: 'Training (Learning)' }
] as const;
