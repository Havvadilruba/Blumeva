import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import CloudinaryStoragePkg from "multer-storage-cloudinary";

const CloudinaryStorage =
  CloudinaryStoragePkg.CloudinaryStorage ||
  CloudinaryStoragePkg.default ||
  CloudinaryStoragePkg;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "uploads";

    switch (file.fieldname) {
      case "logo":
        folder = "brands";
        break;
      case "image":
        folder = "categories";
        break;
      case "bannerImage":
        folder = "banners";
        break;
      case "images":
        folder = "products";
        break;
      case "profileImage":
        folder = "profile";
        break;
    }

    console.log(`📤 Uploading to Cloudinary: ${file.originalname} -> ${folder}`);

    return {
      folder,
      resource_type: "image",
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
      timeout: 120000, // 2 minutes for Cloudinary upload
    };
  },
});

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
    fieldSize: 50 * 1024 * 1024  // 50MB for form fields
  }
});

// Error handling middleware for multer
export const multerErrorHandler = (err, req, res, next) => {
  // If no error, pass to next middleware
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'File size too large. Maximum 10MB per file.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Too many files. Maximum 5 files allowed.' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      message: `Upload error: ${err.message}` 
    });
  }
  
  if (err?.message === 'Invalid image format') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid image format. Only JPEG, PNG, WebP, AVIF, GIF allowed.' 
    });
  }

  if (err) {
    console.error('Upload Error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during file upload. Check Cloudinary configuration.' 
    });
  }
  
  next();
};

export default upload;
