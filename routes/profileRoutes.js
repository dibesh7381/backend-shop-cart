// routes/profileRoutes.js
import express from "express";
import { getProfile, updateProfile, updateProfilePic } from "../controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import upload from "../utils/multerConfig.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
router.put("/pic", authMiddleware, upload.single("file"), updateProfilePic);

export default router;
