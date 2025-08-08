import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Storage service interface
 */
export class StorageService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save a file and return storage key
   * @param {Express.Multer.File} file - The uploaded file
   * @returns {Promise<{storageKey: string, fileId: string}>}
   */
  async save(file) {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    const storageKey = `${fileId}${extension}`;
    const filePath = path.join(this.uploadDir, storageKey);

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            storageKey,
            fileId,
            name: file.originalname,
            size: file.size,
            mime: file.mimetype
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
    const filePath = path.join(this.uploadDir, storageKey);
    
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
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
   * @returns {Promise<fs.ReadStream>}
   */
  async getStream(storageKey) {
    const filePath = path.join(this.uploadDir, storageKey);
    
    return new Promise((resolve, reject) => {
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          reject(new Error('File not found'));
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
    const filePath = path.join(this.uploadDir, storageKey);
    
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            size: stats.size,
            mime: this.getMimeType(path.extname(storageKey))
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
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

// Create singleton instance
const storageService = new StorageService();
export default storageService;
