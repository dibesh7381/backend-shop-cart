import Member from "../models/Member.js";
import { upload } from "../middleware/multer.js"; // agar multer separate middleware banaya hai

// Get profile
export const getProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.user.userId).select("-password");
    res.json({ user: member });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// Update profile (name)
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const updated = await Member.findByIdAndUpdate(
      req.user.userId,
      { name },
      { new: true }
    ).select("-password");
    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// Update profile picture
export const updateProfilePic = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const updatedUser = await Member.findByIdAndUpdate(
      req.user.userId,
      { profilePic: req.file.path },
      { new: true }
    ).select("-password");
    res.json({ user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile picture" });
  }
};
