import cloudinary from "./config/cloudinary.js";
import fs from "fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node test-cloudinary-upload.js /path/to/image.jpg");
  process.exit(1);
}

(async () => {
  try {
    const res = await cloudinary.uploader.upload(file, { folder: "blumeva_test" });
    console.log("Upload success:", res.secure_url);
  } catch (err) {
    console.error("Upload failed:", err);
    process.exit(1);
  }
})();
