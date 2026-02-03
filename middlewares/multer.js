// import multer from "multer";
// import { createRequire } from "module";
// import cloudinary from "../config/cloudinary.js";

// const require = createRequire(import.meta.url);
// const cloudinaryStoragePkg  = require("multer-storage-cloudinary");

// const CloudinaryStorage =
//   cloudinaryStoragePkg.CloudinaryStorage ||
//   cloudinaryStoragePkg.default ||
//   cloudinaryStoragePkg;

// const storage =  new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => {
//     let folder = "uploads";

//     if (file.fieldname === "logo") folder = "brands";
//     if (file.fieldname === "image") folder = "categories";
//     if (file.fieldname === "bannerImage") folder = "banners";
//     if (file.fieldname === "images") folder = "products";
//     if (file.fieldname === "profileImage") folder = "profile";

//     return {
//       folder,
//       resource_type: "image", 
//       allowed_formats: [
//         "jpg",
//         "jpeg",
//         "png",
//         "webp",
//         "avif",
//         "gif",
//         "svg" 
//       ],
//       public_id: file.originalname.split(".")[0] + "-" + Date.now(),
//     };
//   },
// });

// const upload = multer({ storage });

// export default upload;


import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default upload;

