#!/usr/bin/env node

/**
 * AWS S3 Setup Script
 *
 * This script helps you set up AWS S3 for the claim management system.
 * Run this script to create the S3 bucket if it doesn't exist and test file operations.
 */

import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, "..", ".env");
const prodEnvPath = path.join(__dirname, "..", "config.production.env");

// Try to load .env first, then production config as fallback
dotenv.config({ path: envPath });
dotenv.config({ path: prodEnvPath });

async function setupAWSS3() {
  console.log(
    "🚀 Setting up AWS S3 for Claim Management System...\n"
  );

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "claim-files";

  if (!accessKeyId || !secretAccessKey || !region) {
    console.error(
      "❌ AWS credentials are not set in environment variables."
    );
    console.log("\n📋 To set up AWS S3:");
    console.log("1. Go to AWS Console (https://console.aws.amazon.com)");
    console.log("2. Navigate to IAM and create a new user or use an existing one");
    console.log("3. Attach the 'AmazonS3FullAccess' policy (or create a custom policy with S3 permissions)");
    console.log("4. Create access keys for the user");
    console.log("5. Set the following environment variables:");
    console.log("   - AWS_ACCESS_KEY_ID=your-access-key-id");
    console.log("   - AWS_SECRET_ACCESS_KEY=your-secret-access-key");
    console.log("   - AWS_REGION=your-region (e.g., us-east-1)");
    console.log("   - AWS_S3_BUCKET_NAME=your-bucket-name (optional, defaults to 'claim-files')");
    console.log("\n🔗 AWS S3 Setup Guide:");
    console.log(
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html"
    );
    return;
  }

  try {
    // Create S3 client
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    console.log("✅ Connected to AWS S3");

    // Check if bucket exists
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`✅ Bucket '${bucketName}' already exists`);
    } catch (error) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, try to create it
        try {
          // Note: Bucket names must be globally unique and follow S3 naming rules
          await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
          console.log(
            `✅ Created bucket '${bucketName}' in region '${region}'`
          );
        } catch (createError) {
          console.error(`❌ Failed to create bucket '${bucketName}':`, createError.message);
          console.log("\n💡 Bucket names must be globally unique. Try a different name.");
          console.log("   You can also create the bucket manually in the AWS Console.");
          return;
        }
      } else {
        throw error;
      }
    }

    // Test upload and download
    console.log("\n🧪 Testing file operations...");

    const testKey = "test-file.txt";
    const testContent = "This is a test file for claim management system.";

    // Upload test file
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: "text/plain",
    });

    await s3Client.send(putCommand);
    console.log("✅ Test file uploaded successfully");

    // Download test file
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    const downloadResponse = await s3Client.send(getCommand);
    const downloadedContent = await streamToString(downloadResponse.Body);

    if (downloadedContent === testContent) {
      console.log("✅ Test file downloaded successfully");
    } else {
      console.log("❌ Test file download failed - content mismatch");
    }

    // Clean up test file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    });

    await s3Client.send(deleteCommand);
    console.log("✅ Test file cleaned up");

    console.log("\n🎉 AWS S3 setup completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Deploy your application to production");
    console.log("2. Set the environment variables in your hosting platform:");
    console.log(`   - AWS_ACCESS_KEY_ID=${accessKeyId}`);
    console.log(`   - AWS_SECRET_ACCESS_KEY=${secretAccessKey}`);
    console.log(`   - AWS_REGION=${region}`);
    console.log(`   - AWS_S3_BUCKET_NAME=${bucketName}`);
    console.log("3. Test file uploads and downloads in your application");
    console.log("\n🔒 Security Note:");
    console.log("   - Never commit AWS credentials to version control");
    console.log("   - Use IAM roles when running on AWS infrastructure (EC2, Lambda, etc.)");
    console.log("   - Consider using AWS Secrets Manager for production credentials");
  } catch (error) {
    console.error("❌ Failed to set up AWS S3:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Check your AWS credentials are correct");
    console.log("2. Ensure your IAM user has S3 permissions");
    console.log("3. Verify the bucket name is globally unique and follows S3 naming rules");
    console.log("4. Check that the region is correct");
  }
}

// Helper function to convert stream to string
async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString());
    });
    stream.on("error", reject);
  });
}

// Run the setup
setupAWSS3().catch(console.error);

