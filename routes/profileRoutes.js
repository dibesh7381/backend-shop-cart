import express from "express";
import { getProfile, updateProfile } from "../controllers/profileController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get user profile
router.get("/", authMiddleware, getProfile);

// Update user profile
router.put("/update", authMiddleware, updateProfile);

export default router;
