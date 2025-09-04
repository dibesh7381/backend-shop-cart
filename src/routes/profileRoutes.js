import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getProfile, updateProfile, updateProfilePic } from "../controllers/profileController.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";

// Multer & Cloudinary setup (same as tera main code)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_pics",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1000, crop: "limit" }],
  },
});
const upload = multer({ storage });

const router = express.Router();

// Get profile
router.get("/", authMiddleware, getProfile);

// Update name
router.put("/", authMiddleware, updateProfile);

// Update profile picture
router.put("/pic", authMiddleware, upload.single("file"), updateProfilePic);

export default router;
