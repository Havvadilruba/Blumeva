import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import pkg from "multer-storage-cloudinary";

const { CloudinaryStorage } = pkg;

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
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

    return {
      folder,
      resource_type: "image",
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/svg+xml",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image format"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
});

export default upload;
