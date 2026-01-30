import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "uploads";

    if (file.fieldname === "logo") folder = "brands";
    if (file.fieldname === "image") folder = "categories";
    if (file.fieldname === "bannerImage") folder = "banners";
    if (file.fieldname === "images") folder = "products";
    if (file.fieldname === "profileImage") folder = "profile";

    return {
      folder,
      resource_type: "image", // 🔑 REQUIRED for SVG
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "avif",
        "gif",
        "svg" 
      ],
      public_id: file.originalname.split(".")[0] + "-" + Date.now(),
    };
  },
});

const upload = multer({ storage });

export default upload;



