# Claim Form Improvements

## Overview
The claim form has been significantly improved with the following new features:

### 1. Multi-Select Sub-Categories
- Users can now select multiple sub-categories for a single claim
- Each selected sub-category generates available line item types
- Perfect for complex claims like "Business & Lodging" where users need flight, local transport, meals, and hotel in one claim

### 2. Enhanced Line Items
- **Name of the particular**: Each line item now has a name field
- **Currency Support**: INR, USD, EUR with real-time conversion to INR
- **GST Total**: Separate field for GST amounts
- **Description**: Optional description field for each line item
- **Amount in INR**: Automatically calculated and displayed

### 3. Dynamic Line Item Addition
- Single "Add" button appears below each line item
- Maximum of 15 line items per claim
- Each line item type has its own icon and specific fields

### 4. Currency Conversion
- Real-time conversion using exchangerate.host API
- Historical rate support for past dates
- Fallback rates if API is unavailable
- Caching to reduce API calls

### 5. File Attachments
- PDF and image uploads per line item
- Multiple file support
- Proof/documentation for each expense

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the frontend directory:

```bash
# Exchange Rate API Key
# Get your free API key from https://exchangerate.host/
NEXT_PUBLIC_EXCHANGERATE_API_KEY=your_api_key_here
```

### 2. API Key Setup
1. Visit https://exchangerate.host/
2. Sign up for a free account
3. Get your API key
4. Add it to the environment file

### 3. Database Schema Updates
The backend has been updated to support:
- `subCategories` array instead of single `subCategory`
- New line item fields: `name`, `description`, `currency`, `gstTotal`, `amountInINR`
- Enhanced validation and calculations

## Usage Flow

1. **Select Business Unit**: Choose from Alliance, Coinnovation, General
2. **Select Category**: Choose main category (e.g., Business & Lodging)
3. **Multi-Select Sub-Categories**: Select multiple sub-categories (e.g., Flight, Local Transport, Meals, Hotel)
4. **Add Line Items**: Each sub-category provides specific line item types
5. **Fill Line Item Details**:
   - Name of the particular
   - Date
   - Description (optional)
   - Currency (INR/USD/EUR)
   - Amount
   - GST Total
   - Type-specific fields (e.g., flight details, hotel details)
   - Attachments (proof documents)
6. **Review Totals**: See grand total, advances, and net payable
7. **Submit Claim**: All amounts are converted to INR for processing

## Technical Implementation

### Frontend Changes
- `ImprovedClaimForm.tsx`: New dynamic form component
- `currencyConverter.ts`: Currency conversion utility
- `categoryMaster.ts`: Centralized category configuration
- Updated schemas for validation

### Backend Changes
- Updated `Claim.js` model with new fields
- Updated `claimController.js` to handle new structure
- Enhanced validation and calculations

### Key Features
- **Real-time Currency Conversion**: Uses exchangerate.host API with caching
- **Dynamic Form Rendering**: Based on category master configuration
- **Multi-level Validation**: Frontend and backend validation
- **File Upload Support**: Per-line-item attachments
- **Responsive Design**: Works on desktop and mobile

## Error Handling
- API failures fall back to approximate conversion rates
- Form validation prevents invalid submissions
- User-friendly error messages
- Graceful degradation when services are unavailable

## Performance Optimizations
- Currency rate caching (5-minute cache)
- Debounced form updates
- Efficient re-rendering
- Optimized API calls
