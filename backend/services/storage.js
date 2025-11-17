import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Storage service interface with AWS S3 support
 */
export class StorageService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.useCloudStorage =
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID.trim() !== "" &&
      process.env.AWS_SECRET_ACCESS_KEY.trim() !== "" &&
      process.env.AWS_REGION.trim() !== "";

    console.log("Storage Service Initialization:", {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      useCloudStorage: this.useCloudStorage,
      nodeEnv: process.env.NODE_ENV
    });

    if (this.useCloudStorage) {
      this.initializeS3();
    } else {
      console.log("Using local storage - AWS S3 not configured");
      this.ensureUploadDir();
    }
  }

  /**
   * Initialize AWS S3 client
   */
  async initializeS3() {
    try {
      const { S3Client } = await import("@aws-sdk/client-s3");

      this.s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      this.bucketName = process.env.AWS_S3_BUCKET_NAME || "claim-files";

      // Ensure bucket exists (or create if needed)
      await this.ensureBucketExists();

      console.log(
        "AWS S3 initialized for bucket:",
        this.bucketName
      );
    } catch (error) {
      console.error(
        "Failed to initialize AWS S3, falling back to local storage:",
        error
      );
      this.useCloudStorage = false;
      this.ensureUploadDir();
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
   * Ensure upload directory exists (for local storage)
   */
  ensureUploadDir() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        console.log("Upload directory created:", this.uploadDir);
      } else {
        console.log("Upload directory exists:", this.uploadDir);
      }
    } catch (error) {
      console.error("Error creating upload directory:", error);
      throw error;
    }
  }

  /**
   * Save a file and return storage key
   * @param {Express.Multer.File} file - The uploaded file
   * @returns {Promise<{storageKey: string, fileId: string}>}
   */
  async save(file) {
    try {
      console.log("Storage service saving file:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferLength: file.buffer ? file.buffer.length : 0,
        useCloudStorage: this.useCloudStorage,
      });

      const fileId = uuidv4();
      const extension = path.extname(file.originalname);
      const storageKey = `${fileId}${extension}`;

      if (this.useCloudStorage && this.s3Client) {
        return await this.saveToS3(file, storageKey, fileId);
      } else {
        return await this.saveToLocal(file, storageKey, fileId);
      }
    } catch (error) {
      console.error("Storage service save error:", error);
      throw error;
    }
  }

  /**
   * Save file to AWS S3
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

    console.log("File saved to AWS S3:", storageKey);

    return {
      storageKey,
      fileId,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    };
  }

  /**
   * Save file to local storage
   */
  async saveToLocal(file, storageKey, fileId) {
    const filePath = path.join(this.uploadDir, storageKey);

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          console.error("Error writing file:", err);
          reject(err);
        } else {
          console.log("File saved locally:", filePath);
          resolve({
            storageKey,
            fileId,
            name: file.originalname,
            size: file.size,
            mime: file.mimetype,
          });
        }
      });
    });
  }

  /**
   * Remove a file by storage key
   * @param {string} storageKey - The storage key to remove
   * @returns {Promise<void>}
   */
  async remove(storageKey) {
    if (this.useCloudStorage && this.s3Client) {
      return await this.removeFromS3(storageKey);
    } else {
      return await this.removeFromLocal(storageKey);
    }
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

  /**
   * Remove file from local storage
   */
  async removeFromLocal(storageKey) {
    const filePath = path.join(this.uploadDir, storageKey);

    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get file stream for reading
   * @param {string} storageKey - The storage key
   * @returns {Promise<fs.ReadStream|ReadableStream>}
   */
  async getStream(storageKey) {
    if (this.useCloudStorage && this.s3Client) {
      return await this.getStreamFromS3(storageKey);
    } else {
      return await this.getStreamFromLocal(storageKey);
    }
  }

  /**
   * Get file stream from AWS S3
   */
  async getStreamFromS3(storageKey) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await this.s3Client.send(command);
    
    // AWS S3 SDK v3 returns response.Body as a Readable stream
    // Ensure it's properly handled for Express piping
    if (!response.Body) {
      throw new Error("No body in S3 response");
    }
    
    return response.Body;
  }

  /**
   * Get file stream from local storage
   */
  async getStreamFromLocal(storageKey) {
    const filePath = path.join(this.uploadDir, storageKey);

    return new Promise((resolve, reject) => {
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(new Error("File not found"));
        } else {
          resolve(fs.createReadStream(filePath));
        }
      });
    });
  }

  /**
   * Get file info
   * @param {string} storageKey - The storage key
   * @returns {Promise<{size: number, mime: string}>}
   */
  async getInfo(storageKey) {
    if (this.useCloudStorage && this.s3Client) {
      return await this.getInfoFromS3(storageKey);
    } else {
      return await this.getInfoFromLocal(storageKey);
    }
  }

  /**
   * Get file info from AWS S3
   */
  async getInfoFromS3(storageKey) {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await this.s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      mime: response.ContentType || this.getMimeType(path.extname(storageKey)),
    };
  }

  /**
   * Get file info from local storage
   */
  async getInfoFromLocal(storageKey) {
    const filePath = path.join(this.uploadDir, storageKey);

    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            size: stats.size,
            mime: this.getMimeType(path.extname(storageKey)),
          });
        }
      });
    });
  }

  /**
   * Get MIME type from extension
   * @param {string} extension - File extension
   * @returns {string} MIME type
   */
  getMimeType(extension) {
    const mimeTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
    };

    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
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
