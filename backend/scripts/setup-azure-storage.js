#!/usr/bin/env node

/**
 * Azure Storage Setup Script
 *
 * This script helps you set up Azure Blob Storage for the claim management system.
 * Run this script to create the storage account and container if they don't exist.
 */

import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

async function setupAzureStorage() {
  console.log(
    "🚀 Setting up Azure Blob Storage for Claim Management System...\n"
  );

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER || "claim-files";

  if (!connectionString) {
    console.error(
      "❌ AZURE_STORAGE_CONNECTION_STRING is not set in environment variables."
    );
    console.log("\n📋 To set up Azure Storage:");
    console.log("1. Go to Azure Portal (https://portal.azure.com)");
    console.log("2. Create a new Storage Account or use an existing one");
    console.log('3. Go to "Access keys" in the storage account');
    console.log("4. Copy the connection string");
    console.log(
      "5. Set AZURE_STORAGE_CONNECTION_STRING in your environment variables"
    );
    console.log("\n🔗 Azure Storage Account Setup Guide:");
    console.log(
      "https://docs.microsoft.com/en-us/azure/storage/common/storage-account-create"
    );
    return;
  }

  try {
    // Create blob service client
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    console.log("✅ Connected to Azure Storage Account");

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists
    const containerExists = await containerClient.exists();

    if (containerExists) {
      console.log(`✅ Container '${containerName}' already exists`);
    } else {
      // Create container with private access (no public access)
      await containerClient.createIfNotExists();
      console.log(
        `✅ Created container '${containerName}' with private access`
      );
    }

    // Test upload and download
    console.log("\n🧪 Testing file operations...");

    const testBlobName = "test-file.txt";
    const testContent = "This is a test file for claim management system.";
    const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);

    // Upload test file
    await blockBlobClient.upload(testContent, testContent.length, {
      blobHTTPHeaders: {
        blobContentType: "text/plain",
      },
    });
    console.log("✅ Test file uploaded successfully");

    // Download test file
    const downloadResponse = await blockBlobClient.download();
    const downloadedContent = await streamToString(
      downloadResponse.readableStreamBody
    );

    if (downloadedContent === testContent) {
      console.log("✅ Test file downloaded successfully");
    } else {
      console.log("❌ Test file download failed - content mismatch");
    }

    // Clean up test file
    await blockBlobClient.delete();
    console.log("✅ Test file cleaned up");

    console.log("\n🎉 Azure Blob Storage setup completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Deploy your application to production");
    console.log("2. Set the environment variables in your hosting platform:");
    console.log(`   - AZURE_STORAGE_CONNECTION_STRING=${connectionString}`);
    console.log(`   - AZURE_STORAGE_CONTAINER=${containerName}`);
    console.log("3. Test file uploads and downloads in your application");
  } catch (error) {
    console.error("❌ Failed to set up Azure Storage:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check your connection string is correct");
    console.log("2. Ensure your Azure Storage Account is accessible");
    console.log("3. Verify you have the necessary permissions");
  }
}

// Helper function to convert stream to string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream.on("error", reject);
  });
}

// Run the setup
setupAzureStorage().catch(console.error);
