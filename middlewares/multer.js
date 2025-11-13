import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";



const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "uploads";

    
    if (file.fieldname === "logo") folder = "brands"; 
    if (file.fieldname === "image") folder = "categories";
    if (file.fieldname === "images") folder = "products"; 

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: file.originalname.split(".")[0] + "-" + Date.now(), // unique filename
    };
  },
});

const upload = multer({ storage });

export default upload;



