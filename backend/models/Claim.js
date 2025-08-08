import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
  fileId: String,
  name: String,
  size: Number,
  mime: String,
  storageKey: String,
  label: String // for required document matching
}, { _id: false });

const LineItemBase = {
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  notes: String,
  attachments: { type: [AttachmentSchema], default: [] },
  type: { type: String, required: true }
};

const LineItemSchema = new mongoose.Schema({
  ...LineItemBase,
  // Flight/Train specific fields
  from: String,
  to: String,
  airline: String,
  pnr: String,
  invoiceNo: String,
  trainNo: String,
  class: String,
  
  // Local travel
  mode: String, // auto/taxi/metro/bus
  kilometers: Number,
  
  // Meal/Lodging
  city: String,
  mealType: String, // breakfast/lunch/dinner/snack
  checkIn: Date,
  checkOut: Date,
  nights: Number,
  
  // GST
  gst: {
    gstin: String,
    taxBreakup: {
      cgst: Number,
      sgst: Number,
      igst: Number
    }
  },
  
  // Client entertainment
  attendeeCount: Number,
  customer: String,
  
  // Admin misc
  subCategory: String
}, { _id: true });

const AdvanceSchema = new mongoose.Schema({
  date: Date,
  refNo: String,
  amount: Number
}, { _id: true });

const ClaimSchema = new mongoose.Schema({
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['Alliance', 'Co-Innovation', 'Tech', 'Admin Exp', 'Employee-Related Exp'], 
    required: true 
  },
  accountHead: { 
    type: String, 
    enum: ['Business Travel', 'Fuel', 'Business Promotion', 'Admin Exp', 'Training (Learning)'], 
    required: true 
  },
  trip: {
    fromDate: Date,
    toDate: Date,
    purpose: String,
    costCenter: String,
    project: String,
    cityClass: String
  },
  advances: { 
    type: [AdvanceSchema], 
    default: [] 
  },
  lineItems: { 
    type: [LineItemSchema], 
    default: [] 
  },
  totalsByHead: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  grandTotal: Number,
  netPayable: Number,
  status: { 
    type: String, 
    enum: ['submitted', 'approved', 'rejected', 'finance_approved', 'paid'], 
    default: 'submitted' 
  },
  policyVersion: String,
  violations: [{
    code: String,
    message: String,
    level: { 
      type: String, 
      enum: ['warn', 'error'] 
    }
  }],
  
  // Approval/Rejection tracking
  supervisorApproval: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
    reason: String,
    notes: String
  },
  financeApproval: {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
    reason: String,
    notes: String
  },
  
  // Payment tracking
  payment: {
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,
    channel: String,
    reference: String
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Claim', ClaimSchema);
