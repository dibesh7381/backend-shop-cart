import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";
import {
  getProfile,
  updateProfile,
  updateProfilePic
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);
router.put("/pic", authMiddleware, upload.single("file"), updateProfilePic);

export default router;
