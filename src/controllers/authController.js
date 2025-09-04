import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Member from "../models/Member.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const existing = await Member.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMember = new Member({ name, email, password: hashedPassword, role: role || "customer" });
    await newMember.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch {
    res.status(500).json({ message: "Error registering user" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const member = await Member.findOne({ email });
    if (!member) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: member._id, role: member.role, name: member.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user: { id: member._id, name: member.name, role: member.role, email: member.email, profilePic: member.profilePic } });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
