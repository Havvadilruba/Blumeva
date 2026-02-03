import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

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
  const allowed = /jpg|jpeg|png|webp|avif|gif|svg/;
  const ext = file.mimetype.split("/")[1];

  if (allowed.test(ext)) cb(null, true);
  else cb(new Error("Invalid image format"), false);
};

const upload = multer({
  storage,
  fileFilter,
});

export default upload;
