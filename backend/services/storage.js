import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Storage service for AWS S3 only (public bucket)
 */
export class StorageService {
  constructor() {
    this.s3Client = null;
    this.bucketName = null;
    this.region = null;
    this.initializing = false;
    this.initialized = false;
    
    // Check for AWS credentials - S3 is required
    const hasAccessKey = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID.trim() !== "";
    const hasSecretKey = process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY.trim() !== "";
    const hasRegion = process.env.AWS_REGION && process.env.AWS_REGION.trim() !== "";
    
    if (!hasAccessKey || !hasSecretKey || !hasRegion) {
      throw new Error("AWS S3 credentials are required. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables.");
    }

    console.log("Storage Service Initialization (S3 Only):", {
      hasAccessKey,
      hasSecretKey,
      hasRegion,
      nodeEnv: process.env.NODE_ENV,
      accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...',
      region: process.env.AWS_REGION,
      bucketName: process.env.AWS_S3_BUCKET_NAME || 'claim-files'
    });

    // Initialize S3 asynchronously
    this.initializeS3().catch((error) => {
      console.error("Failed to initialize S3:", error);
      throw error;
    });
  }

  /**
   * Initialize AWS S3 client
   */
  async initializeS3() {
    if (this.initializing) {
      return;
    }
    
    this.initializing = true;
    
    try {
      const { S3Client } = await import("@aws-sdk/client-s3");

      this.region = process.env.AWS_REGION;
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      this.bucketName = process.env.AWS_S3_BUCKET_NAME || "claim-files";

      // Ensure bucket exists
      await this.ensureBucketExists();

      this.initialized = true;
      console.log("✅ AWS S3 initialized successfully for bucket:", this.bucketName);
    } catch (error) {
      console.error("❌ Failed to initialize AWS S3:", error.message || error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Ensure S3 bucket exists
   */
  async ensureBucketExists() {
    try {
      const { HeadBucketCommand, CreateBucketCommand } = await import("@aws-sdk/client-s3");
      
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
        console.log(`Bucket '${this.bucketName}' already exists`);
      } catch (error) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
          // Bucket doesn't exist, try to create it
          try {
            await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
            console.log(`Created bucket '${this.bucketName}'`);
          } catch (createError) {
            console.warn(`Could not create bucket '${this.bucketName}'. It may need to be created manually or you may not have permissions.`);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.warn("Could not verify bucket existence:", error.message);
    }
  }

  /**
   * Get public URL for a file in S3
   * @param {string} storageKey - The storage key
   * @returns {string} Public URL
   */
  getPublicUrl(storageKey) {
    if (!this.bucketName || !this.region) {
      throw new Error("S3 not initialized");
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }

  /**
   * Ensure S3 is initialized before use
   */
  async ensureS3Initialized() {
    if (this.s3Client) {
      return true;
    }
    
    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing && !this.s3Client) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return !!this.s3Client;
    }
    
    // Try to initialize now
    await this.initializeS3();
    return !!this.s3Client;
  }

  /**
   * Save a file to S3 and return storage info with public URL
   * @param {Express.Multer.File} file - The uploaded file
   * @returns {Promise<{storageKey: string, fileId: string, url: string}>}
   */
  async save(file) {
    try {
      console.log("Storage service saving file to S3:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer ? file.buffer.length : 0,
      });

      const fileId = uuidv4();
      const extension = path.extname(file.originalname);
      const storageKey = `${fileId}${extension}`;

      // Ensure S3 is initialized
      await this.ensureS3Initialized();
      
      if (!this.s3Client) {
        throw new Error("S3 client not initialized");
      }

      console.log("📤 Uploading to S3...");
      const result = await this.saveToS3(file, storageKey, fileId);
      console.log("✅ Upload complete, returning S3 result with public URL");
      return result;
    } catch (error) {
      console.error("Storage service save error:", error);
      throw error;
    }
  }

  /**
   * Save file to AWS S3 with public access
   */
  async saveToS3(file, storageKey, fileId) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        fileId: fileId,
      },
    });

    await this.s3Client.send(command);

    const publicUrl = this.getPublicUrl(storageKey);

    console.log("✅ File saved to AWS S3:", {
      storageKey,
      bucket: this.bucketName,
      size: file.size,
      mime: file.mimetype,
      url: publicUrl
    });

    return {
      storageKey,
      fileId,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
      url: publicUrl,
    };
  }



  /**
   * Remove a file by storage key from S3
   * @param {string} storageKey - The storage key to remove
   * @returns {Promise<void>}
   */
  async remove(storageKey) {
    await this.ensureS3Initialized();
    return await this.removeFromS3(storageKey);
  }

  /**
   * Remove file from AWS S3
   */
  async removeFromS3(storageKey) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    await this.s3Client.send(command);
    console.log("File removed from AWS S3:", storageKey);
  }














}

let storageServiceInstance = null;

function getStorageService() {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
}

// Export a proxy that initializes on first use
const storageService = new Proxy({}, {
  get(target, prop) {
    const service = getStorageService();
    const value = service[prop];
    // If it's a function, bind it to the service instance
    if (typeof value === 'function') {
      return value.bind(service);
    }
    return value;
  }
});

export default storageService;
