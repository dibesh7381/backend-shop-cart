import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../utils/upload.js";
import { getProfile, updateProfile, updateProfilePic } from "../controllers/profileController.js";

const router = express.Router();

// GET profile
router.get("/", authMiddleware, getProfile);

// PUT update name
router.put("/", authMiddleware, updateProfile);

// PUT update profile pic
// ⚠️ Make sure the file key matches frontend input name ("file")
router.put("/pic", authMiddleware, upload.single("file"), updateProfilePic);

export default router;

