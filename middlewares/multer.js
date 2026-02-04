import multer from "multer";
import cloudinary from "../config/cloudinary.js";

// Use memory storage - files are buffered in memory, not on disk
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/svg+xml",
  ];

  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid image format"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    fieldSize: 50 * 1024 * 1024, // 50MB for form fields
  },
});

/**
 * Upload file buffer to Cloudinary via stream
 * Avoids blocking the HTTP request during upload
 * @param {Buffer} fileBuffer - File data in memory
 * @param {string} folder - Cloudinary folder (e.g., "products", "brands")
 * @param {string} filename - Original filename
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
export const cloudinaryUpload = (fileBuffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const upload_stream = cloudinary.uploader.upload_stream(
      {
        folder: `blumeva/${folder}`,
        resource_type: "image",
        public_id: `${Date.now()}-${filename.replace(/\s+/g, "_")}`,
      },
      (error, result) => {
        if (error) {
          console.error(`Error uploading ${filename}:`, error.message);
          return reject(error);
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    // Pipe buffer to upload stream
    upload_stream.end(fileBuffer);
  });
};

// Error handling middleware for multer
export const multerErrorHandler = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum 10MB per file.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 5 files allowed.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err?.message === "Invalid image format") {
    return res.status(400).json({
      success: false,
      message: "Invalid image format. Only JPEG, PNG, WebP, AVIF, GIF allowed.",
    });
  }

  if (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during file upload.",
    });
  }

  next();
};

export default upload;
