import Member from "../models/Member.js";

// ----------------- Get Profile -----------------
export const getProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.user.userId).select("-password");
    if (!member) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user: member });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    return res.status(500).json({ success: false, message: "Error fetching profile", error: err.message });
  }
};

// ----------------- Update Name -----------------
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const updated = await Member.findByIdAndUpdate(
      req.user.userId,
      { name: name.trim() },
      { new: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, message: "Name updated successfully", user: updated });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    return res.status(500).json({ success: false, message: "Error updating profile", error: err.message });
  }
};

// ----------------- Update Profile Picture -----------------
export const updateProfilePic = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const updatedUser = await Member.findByIdAndUpdate(
      req.user.userId,
      { profilePic: req.file.path }, // ✅ Cloudinary URL
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Profile picture updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("❌ Error updating profile picture:", err);
    return res.status(500).json({ success: false, message: "Error updating profile picture", error: err.message });
  }
};
