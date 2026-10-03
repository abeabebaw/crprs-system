const fs = require('fs');
const path = require('path');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage Service Adapter
 * Provides local filesystem storage with MinIO / S3 object storage compatibility hooks
 */
const storageService = {
  isS3Configured() {
    return Boolean(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY);
  },

  getUploadDir() {
    return uploadDir;
  },

  resolveLocalPath(storedPath) {
    if (!storedPath) return null;
    if (fs.existsSync(storedPath)) return path.resolve(storedPath);

    const baseName = path.basename(storedPath);
    const directUploadPath = path.join(uploadDir, baseName);
    if (fs.existsSync(directUploadPath)) return path.resolve(directUploadPath);

    const relativePath = path.join(__dirname, '..', storedPath);
    if (fs.existsSync(relativePath)) return path.resolve(relativePath);

    return null;
  },

  async deleteLocalFile(filePath) {
    const resolved = this.resolveLocalPath(filePath);
    if (resolved && fs.existsSync(resolved)) {
      try {
        fs.unlinkSync(resolved);
        return true;
      } catch (err) {
        console.error('Error deleting file:', err);
        return false;
      }
    }
    return false;
  }
};

module.exports = storageService;
