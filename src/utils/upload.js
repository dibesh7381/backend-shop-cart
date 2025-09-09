import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const allowedFormats = ["jpg", "jpeg", "png", "webp"];
    const ext = file.mimetype.split("/")[1];
    if (!allowedFormats.includes(ext)) {
      throw new Error("Invalid file format. Only jpg, jpeg, png, webp allowed.");
    }

    const folder = req.baseUrl.includes("profile") ? "profile_pics" : "shop_products";

    return {
      folder,
      allowed_formats: allowedFormats,
      transformation: [{ width: 1000, crop: "limit" }],
      public_id: Date.now() + "-" + file.originalname.split(".")[0],
    };
  },
});

export const upload = multer({ storage });
