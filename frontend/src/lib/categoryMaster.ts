export interface SubCategory {
  name: string;
  itc?: string;
}

export interface Category {
  name: string;
  subCategories: SubCategory[];
  notes?: string;
}

export interface LineItemType {
  mapsTo: string[];
  fields: string[];
  attachments: 'multi' | 'optional' | 'single';
  requiredDocuments?: string[];
  headBucket: string;
}

export interface Policy {
  cityClasses: string[];
  perDiemCaps: Record<string, Record<string, number>>;
  lodgingCapsPerNight: Record<string, number>;
  mileageRatePerKmINR: number;
  rules: {
    requiredDocs: Record<string, string[]>;
    blocking: string[];
    warnings: string[];
  };
  itcFlags: Record<string, string>;
}

export const categoryMaster: Category[] = [
  {
    name: "Travel & Lodging",
    subCategories: [
      { name: "Airfare – Domestic", itc: "Eligible if business" },
      { name: "Airfare – International", itc: "Non-GST" },
      { name: "Rail/Bus – Domestic", itc: "Eligible" },
      { name: "Local Transport (Taxi/Ride-hailing, Metro, Auto)", itc: "Eligible if GST invoice" },
      { name: "Fuel & Tolls (Personal Reimbursed)", itc: "Generally NA" },
      { name: "Hotel/Lodging – Domestic", itc: "Eligible; capture GSTIN" },
      { name: "Hotel/Lodging – International", itc: "Non-GST" },
      { name: "Meals – Travel", itc: "Blocked; tag for T&E analytics" },
      { name: "Visa/Travel Docs/Insurance", itc: "NA/Non-GST" },
      { name: "Foreign Exchange & Bank Fees", itc: "Non-GST" }
    ]
  },
  {
    name: "Client Entertainment & Business Meals",
    subCategories: [
      { name: "Client Meetings – Meals/Refreshments", itc: "Blocked" },
      { name: "Internal Team Meals (Non-travel)", itc: "Blocked" }
    ],
    notes: "F&B ITC is generally blocked unless mandated by law or onward supply."
  },
  {
    name: "Employee Welfare & HR",
    subCategories: [
      { name: "Team Events / Celebrations", itc: "Blocked" },
      { name: "Gifts & Rewards (Staff)", itc: "Blocked; track per employee for limits" },
      { name: "Snacks & Pantry", itc: "Blocked" }
    ]
  },
  {
    name: "Training & Development",
    subCategories: [
      { name: "Course/Certification Fees", itc: "Eligible if business" },
      { name: "Conference/Seminar/Workshop", itc: "Eligible" },
      { name: "Books/Reference Material", itc: "Eligible" },
      { name: "Exam Fees", itc: "Non-GST/Eligible as exp" }
    ]
  },
  {
    name: "Marketing & Business Development",
    subCategories: [
      { name: "Events/Booths/Sponsorships", itc: "Eligible" },
      { name: "Digital Ads/Promotions", itc: "Eligible" },
      { name: "Design/Printing/Collateral", itc: "Eligible" },
      { name: "Client Gifts (Marketing)", itc: "Blocked" }
    ]
  },
  {
    name: "Subscriptions & Memberships",
    subCategories: [
      { name: "Professional Body Memberships", itc: "Blocked if personal; Eligible if org-level" },
      { name: "SaaS/Tools – Sales & Marketing", itc: "Eligible" },
      { name: "SaaS/Tools – General/IT", itc: "Eligible" },
      { name: "Admin software subscription", itc: "Eligible" }
    ]
  },
  {
    name: "Office & Admin",
    subCategories: [
      { name: "Stationery & Office Supplies", itc: "Eligible" },
      { name: "Courier/Postage", itc: "Eligible" },
      { name: "Printing/Photocopy", itc: "Eligible" },
      { name: "Communication – Mobile/Data Reimbursement", itc: "Eligible if GST bill to company GSTIN" },
      { name: "Rent", itc: "Eligible" }
    ]
  },
  {
    name: "IT & Software",
    subCategories: [
      { name: "Software Licences (One-time)", itc: "Eligible" },
      { name: "Cloud Services", itc: "Eligible" },
      { name: "Peripherals & Small Hardware", itc: "Eligible" },
      { name: "IT Equipment (CapEx threshold)", itc: "Capitalize if > policy; Eligible" }
    ]
  },
  {
    name: "Project / Client-Billable Expenses",
    subCategories: [
      { name: "Onsite Travel & Lodging (Billable)", itc: "Mirror travel sub-cats" },
      { name: "Third-party Tools (Short-term)", itc: "Eligible" },
      { name: "Project Incidentals (Supplies/consumables)", itc: "" }
    ]
  },
  {
    name: "Finance, Legal & Compliance",
    subCategories: [
      { name: "Bank Charges / Payment Gateway / FX Fees", itc: "Non-GST" },
      { name: "Professional Fees (CA/Legal)", itc: "Eligible" },
      { name: "Government Fees (ROC, Visa, Permit)", itc: "Non-GST" },
      { name: "GST/Taxes (Non-creditable)", itc: "Tracking only; no ITC" }
    ]
  },
  {
    name: "Advances & Reconciliations",
    subCategories: [
      { name: "Employee Advance – Travel" },
      { name: "Employee Advance – General" },
      { name: "Advance Settlement", itc: "Contra" }
    ]
  }
];

export const lineItemTypes: Record<string, LineItemType> = {
  flight: {
    mapsTo: ["Travel & Lodging > Airfare – Domestic", "Travel & Lodging > Airfare – International"],
    fields: ["date", "from", "to", "airline", "pnr", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["airline_invoice", "ota_invoice"],
    headBucket: "Tickets Fare"
  },
  train_bus: {
    mapsTo: ["Travel & Lodging > Rail/Bus – Domestic"],
    fields: ["date", "from", "to", "class", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["ticket", "payment_proof"],
    headBucket: "Tickets Fare"
  },
  local_travel: {
    mapsTo: ["Travel & Lodging > Local Transport (Taxi/Ride-hailing, Metro, Auto)"],
    fields: ["date", "mode", "from", "to", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["receipt"],
    headBucket: "Travel"
  },
  mileage: {
    mapsTo: ["Travel & Lodging > Fuel & Tolls (Personal Reimbursed)"],
    fields: ["date", "kilometers", "amount"],
    attachments: "optional",
    requiredDocuments: [],
    headBucket: "Travel"
  },
  lodging: {
    mapsTo: ["Travel & Lodging > Hotel/Lodging – Domestic", "Travel & Lodging > Hotel/Lodging – International"],
    fields: ["checkIn", "checkOut", "city", "nights", "amount", "gst.gstin", "gst.taxBreakup"],
    attachments: "multi",
    requiredDocuments: ["hotel_tax_invoice"],
    headBucket: "Lodging"
  },
  meal_travel: {
    mapsTo: ["Travel & Lodging > Meals – Travel"],
    fields: ["date", "mealType", "city", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["bill"],
    headBucket: "Food & Snacks"
  },
  client_entertainment: {
    mapsTo: ["Client Entertainment & Business Meals > Client Meetings – Meals/Refreshments"],
    fields: ["date", "customer", "attendeeCount", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["bill"],
    headBucket: "Client Entertainment"
  },
  team_meal: {
    mapsTo: ["Client Entertainment & Business Meals > Internal Team Meals (Non-travel)"],
    fields: ["date", "attendeeCount", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["bill"],
    headBucket: "Food & Snacks"
  },
  admin_misc: {
    mapsTo: ["Office & Admin > Printing/Photocopy", "Office & Admin > Stationery & Office Supplies", "Office & Admin > Courier/Postage"],
    fields: ["date", "subCategory", "amount", "notes"],
    attachments: "multi",
    requiredDocuments: ["bill"],
    headBucket: "Admin Exp"
  }
};

export const businessUnits = ["Alliance", "Coinnovation", "General"];

export const cityClasses = ["A", "B", "C"];

export const mealTypes = ["breakfast", "lunch", "dinner", "snack"];

export const travelModes = ["auto", "taxi", "metro", "bus", "ride_hailing"];

export const documentTypes = [
  "airline_invoice",
  "ota_invoice", 
  "ticket",
  "payment_proof",
  "receipt",
  "hotel_tax_invoice",
  "bill",
  "supporting_doc"
];

// Helper functions
export const getSubCategoriesForCategory = (categoryName: string): SubCategory[] => {
  const category = categoryMaster.find(cat => cat.name === categoryName);
  return category?.subCategories || [];
};

export const getLineItemTypesForSubCategory = (subCategoryName: string): string[] => {
  return Object.entries(lineItemTypes)
    .filter(([_, type]) => type.mapsTo.some(mapping => mapping.includes(subCategoryName)))
    .map(([type, _]) => type);
};

export const getHeadBucketForLineItemType = (type: string): string => {
  return lineItemTypes[type]?.headBucket || "Other";
};

export const getRequiredDocumentsForLineItemType = (type: string): string[] => {
  return lineItemTypes[type]?.requiredDocuments || [];
};
