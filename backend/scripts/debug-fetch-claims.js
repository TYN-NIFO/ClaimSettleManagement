import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Claim from '../models/Claim.js';
import User from '../models/User.js';
import XLSX from 'xlsx';
import path from 'path';

dotenv.config();

async function debugClaims() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully.');

    console.log('Fetching claims...');
    // We fetch everything and log details for troubleshooting
    const claims = await Claim.find()
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 });

    console.log(`Found ${claims.length} claims.\n`);

    if (claims.length === 0) {
      console.log('No claims found in the database.');
    }

    // Prepare data for Excel
    const excelData = [];

    claims.forEach((claim, index) => {
      console.log(`--- Claim ${index + 1} ---`);
      console.log(`ID: ${claim._id}`);
      console.log(`Claim ID: ${claim.claimId || 'N/A'}`);
      console.log(`Employee Name: ${claim.employeeId?.name || 'Unknown User'}`);
      console.log(`Employee Email: ${claim.employeeId?.email || 'No Email'}`);
      console.log(`Department: ${claim.employeeId?.department || 'Unknown'}`);
      console.log(`Status: ${claim.status}`);
      console.log(`Category: ${claim.category}`);
      console.log(`Grand Total: ${claim.grandTotal}`);

      // Add to Excel data (one row per claim for now, or could do one per line item)
      // For detailed export, let's include line item summary in the row
      const lineItemSummary = claim.lineItems?.map(item => `${item.description} (${item.amountInINR || item.amount} INR)`).join('; ') || 'None';

      excelData.push({
        'Employee Name': claim.employeeId?.name || 'Unknown',
        'Employee Email': claim.employeeId?.email || 'N/A',
        'Department': claim.employeeId?.department || 'N/A',
        'Business Unit': claim.businessUnit || 'N/A',
        'Category': claim.category || 'N/A',
        'Status': claim.status || 'N/A',
        'Grand Total': claim.grandTotal || 0,
        'Net Payable': claim.netPayable || 0,
        'Line Items': lineItemSummary,
        'Created At': claim.createdAt ? new Date(claim.createdAt).toLocaleString('en-IN') : 'N/A'
      });

      console.log('Line Items:');
      if (claim.lineItems && claim.lineItems.length > 0) {
        claim.lineItems.forEach((item, i) => {
          console.log(`  Item ${i + 1}: ${item.description}`);
          console.log(`    Date: ${item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'N/A'}`);
          console.log(`    Amount: ${item.amountInINR || item.amount} INR`);

          if (item.attachments && item.attachments.length > 0) {
            console.log('    Documents:');
            item.attachments.forEach(att => {
              console.log(`      - Name: ${att.name}`);
              console.log(`        URL: ${att.url}`);
            });
          } else {
            console.log('    Documents: None');
          }
        });
      } else {
        console.log('  None');
      }

      console.log('------------------------\n');
    });

    if (excelData.length > 0) {
      console.log('Generating Excel file...');
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Claims Export');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `claims_export_${timestamp}.xlsx`;
      const filePath = path.join(process.cwd(), fileName);

      XLSX.writeFile(workbook, filePath);
      console.log(`\n Success! Excel file saved at: ${filePath}`);
    }

  } catch (error) {
    console.error('DEBUG ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

debugClaims();
