import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Storage service interface with Azure Blob Storage support
 */
export class StorageService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads");
    this.useCloudStorage =
      process.env.AZURE_STORAGE_CONNECTION_STRING &&
      process.env.AZURE_STORAGE_CONNECTION_STRING.trim() !== "";

    console.log("Storage Service Initialization:", {
      hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
      connectionStringLength: process.env.AZURE_STORAGE_CONNECTION_STRING?.length || 0,
      useCloudStorage: this.useCloudStorage,
      nodeEnv: process.env.NODE_ENV
    });

    if (this.useCloudStorage) {
      this.initializeAzureBlob();
    } else {
      console.log("Using local storage - Azure not configured");
      this.ensureUploadDir();
    }
  }

  /**
   * Initialize Azure Blob Storage client
   */
  async initializeAzureBlob() {
    try {
      const { BlobServiceClient } = await import("@azure/storage-blob");

      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );

      this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || process.env.AZURE_STORAGE_CONTAINER || "claim-files";
      this.containerClient = this.blobServiceClient.getContainerClient(
        this.containerName
      );

      // Ensure container exists
      await this.containerClient.createIfNotExists();

      console.log(
        "Azure Blob Storage initialized for container:",
        this.containerName
      );
    } catch (error) {
      console.error(
        "Failed to initialize Azure Blob Storage, falling back to local storage:",
        error
      );
      this.useCloudStorage = false;
      this.ensureUploadDir();
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

      if (this.useCloudStorage && this.containerClient) {
        return await this.saveToAzureBlob(file, storageKey, fileId);
      } else {
        return await this.saveToLocal(file, storageKey, fileId);
      }
    } catch (error) {
      console.error("Storage service save error:", error);
      throw error;
    }
  }

  /**
   * Save file to Azure Blob Storage
   */
  async saveToAzureBlob(file, storageKey, fileId) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);

    await blockBlobClient.upload(file.buffer, file.buffer.length, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
      metadata: {
        originalName: file.originalname,
        fileId: fileId,
      },
    });

    console.log("File saved to Azure Blob Storage:", storageKey);

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
    if (this.useCloudStorage && this.containerClient) {
      return await this.removeFromAzureBlob(storageKey);
    } else {
      return await this.removeFromLocal(storageKey);
    }
  }

  /**
   * Remove file from Azure Blob Storage
   */
  async removeFromAzureBlob(storageKey) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);
    await blockBlobClient.delete();
    console.log("File removed from Azure Blob Storage:", storageKey);
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
    if (this.useCloudStorage && this.containerClient) {
      return await this.getStreamFromAzureBlob(storageKey);
    } else {
      return await this.getStreamFromLocal(storageKey);
    }
  }

  /**
   * Get file stream from Azure Blob Storage
   */
  async getStreamFromAzureBlob(storageKey) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);
    const response = await blockBlobClient.download();
    return response.readableStreamBody;
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
    if (this.useCloudStorage && this.containerClient) {
      return await this.getInfoFromAzureBlob(storageKey);
    } else {
      return await this.getInfoFromLocal(storageKey);
    }
  }

  /**
   * Get file info from Azure Blob Storage
   */
  async getInfoFromAzureBlob(storageKey) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(storageKey);
    const properties = await blockBlobClient.getProperties();

    return {
      size: properties.contentLength,
      mime:
        properties.contentType || this.getMimeType(path.extname(storageKey)),
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

// Create singleton instance
const storageService = new StorageService();
export default storageService;
