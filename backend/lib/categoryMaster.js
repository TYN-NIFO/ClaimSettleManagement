// Category master - should match frontend/src/lib/categoryMaster.ts
export const categoryMaster = [
  {
    name: "Travel & Lodging",
    subCategories: [
      { name: "Airfare – Domestic", itc: "Eligible if business" },
      { name: "Airfare – International", itc: "Eligible if business" },
      { name: "Rail/Bus – Domestic", itc: "Eligible" },
      {
        name: "Local Transport (Taxi/Ride-hailing, Metro, Auto)",
        itc: "Eligible",
      },
      { name: "Fuel & Tolls (Personal Reimbursed)", itc: "Not eligible" },
      { name: "Hotel/Lodging – Domestic", itc: "Eligible" },
      { name: "Hotel/Lodging – International", itc: "Eligible" },
      { name: "Meals – Travel", itc: "Not eligible" },
    ],
  },
  {
    name: "Client Entertainment & Business Meals",
    subCategories: [
      { name: "Client Meetings – Meals/Refreshments", itc: "Not eligible" },
      { name: "Internal Team Meals (Non-travel)", itc: "Not eligible" },
    ],
  },
  {
    name: "Employee Welfare & HR",
    subCategories: [
      { name: "Team Building Activities", itc: "Not eligible" },
      { name: "Employee Recognition/Awards", itc: "Not eligible" },
      { name: "Health & Wellness Programs", itc: "Eligible" },
    ],
  },
  {
    name: "Training & Development",
    subCategories: [
      { name: "External Training/Courses", itc: "Eligible" },
      { name: "Certification Fees", itc: "Eligible" },
      { name: "Conference/Seminar Fees", itc: "Eligible" },
    ],
  },
  {
    name: "Marketing & Business Development",
    subCategories: [
      { name: "Trade Shows/Exhibitions", itc: "Eligible" },
      { name: "Marketing Materials", itc: "Eligible" },
      { name: "Promotional Items", itc: "Eligible" },
    ],
  },
  {
    name: "Subscriptions & Memberships",
    subCategories: [
      { name: "Professional Memberships", itc: "Eligible" },
      { name: "Industry Publications", itc: "Eligible" },
      { name: "Online Services/Tools", itc: "Eligible" },
    ],
  },
  {
    name: "Office & Admin",
    subCategories: [
      { name: "Printing/Photocopy", itc: "Eligible" },
      { name: "Stationery & Office Supplies", itc: "Eligible" },
      { name: "Courier/Postage", itc: "Eligible" },
    ],
  },
  {
    name: "IT & Software",
    subCategories: [
      { name: "Software Licences (One-time)", itc: "Eligible" },
      { name: "Software Subscriptions (Recurring)", itc: "Eligible" },
      { name: "Hardware/Equipment", itc: "Eligible" },
    ],
  },
  {
    name: "Project / Client-Billable Expenses",
    subCategories: [
      {
        name: "Onsite Travel & Lodging (Billable)",
        itc: "Mirror travel sub-cats",
      },
      { name: "Client-specific Software/Tools", itc: "Eligible" },
      { name: "Third-party Tools (Short-term)", itc: "Eligible" },
      { name: "Project Incidentals (Supplies/consumables)", itc: "" },
    ],
  },
  {
    name: "Finance, Legal & Compliance",
    subCategories: [
      { name: "Legal/Professional Services", itc: "Eligible" },
      { name: "Audit & Compliance Fees", itc: "Eligible" },
      { name: "Banking & Financial Services", itc: "Eligible" },
    ],
  },
  {
    name: "Advances & Reconciliations",
    subCategories: [
      { name: "Travel Advance", itc: "" },
      { name: "Project Advance", itc: "" },
      { name: "Petty Cash Advance", itc: "" },
    ],
  },
];

// Extract category names for validation
export const validCategories = categoryMaster.map((cat) => cat.name);

// Business units
export const validBusinessUnits = ["Alliance", "Coinnovation", "General"];
