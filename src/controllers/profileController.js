import Member from "../models/Member.js";

// ----------------- Get Profile -----------------
export const getProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.user.userId).select("-password");
    if (!member) return res.status(404).json({ message: "User not found" });
    res.json({ user: member });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// ----------------- Update Name -----------------
export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "")
      return res.status(400).json({ message: "Name is required" });

    const updated = await Member.findByIdAndUpdate(
      req.user.userId,
      { name: name.trim() },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Name updated successfully", user: updated });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// ----------------- Update Profile Picture -----------------
export const updateProfilePic = async (req, res) => {
  try {
    if (!req.file || !req.file.path)
      return res.status(400).json({ message: "No file uploaded" });

    const updatedUser = await Member.findByIdAndUpdate(
      req.user.userId,
      { profilePic: req.file.path },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile picture updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating profile picture:", err);
    res.status(500).json({ message: "Error updating profile picture" });
  }
};
