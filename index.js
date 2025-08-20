

import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ----------------- Cloudinary Setup -----------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shop_products",
    allowed_formats: ["jpg", "jpeg", "png"]
  }
});
const upload = multer({ storage });

// ----------------- MongoDB Models -----------------
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true }
}, { collection: "product", versionKey: false });

const Product = mongoose.model("Product", productSchema);

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "customer" }
}, { collection: "members", versionKey: false });

const Member = mongoose.model("Member", memberSchema);

// ----------------- Auth Middleware -----------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

// ----------------- Role Middleware -----------------
const isSeller = (req, res, next) => {
  if (req.user?.role === "seller") return next();
  return res.status(403).json({ message: "Access denied, only sellers allowed" });
};

// ----------------- Signup -----------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    const existingMember = await Member.findOne({ email });
    if (existingMember) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMember = new Member({ name, email, password: hashedPassword, role: role || "customer" });
    await newMember.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering user" });
  }
});

// ----------------- Login -----------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    const member = await Member.findOne({ email });
    if (!member) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: member._id, role: member.role, name: member.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: member._id, name: member.name, email: member.email, role: member.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error logging in" });
  }
});

// ----------------- Product Routes (Seller only) -----------------
app.post("/products", authMiddleware, isSeller, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });

    const { name, details, quantity, category, price } = req.body;
    const product = new Product({
      name,
      details,
      quantity: Number(quantity),
      category,
      price: Number(price),
      imageUrl: req.file.path
    });

    const saved = await product.save();
    res.status(200).json({ message: "Product uploaded successfully", product: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading product" });
  }
});

app.put("/products/:id", authMiddleware, isSeller, upload.single("file"), async (req, res) => {
  try {
    const { name, details, quantity, category, price } = req.body;
    const updateData = { name, details, quantity: Number(quantity), category, price: Number(price) };
    if (req.file) updateData.imageUrl = req.file.path;

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: "Product updated successfully", product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating product" });
  }
});

app.delete("/products/:id", authMiddleware, isSeller, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });

    if (deleted.imageUrl) {
      const publicId = deleted.imageUrl
        .split("/upload/")[1]
        .replace(/\..+$/, "") 
        .split("/").slice(1).join("/");
      cloudinary.uploader.destroy(publicId, (err, result) => err ? console.error(err) : console.log(result));
    }

    res.json({ message: "Product and image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting product" });
  }
});

// Get all products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// Get products for listing
app.get("/products/listing", async (req, res) => {
  try {
    const products = await Product.find(
      {},
      { imageUrl: 1, price: 1, category: 1, name: 1, quantity: 1, _id: 1 }
    );
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching products for listing" });
  }
});

// ----------------- Quantity Update Endpoints -----------------

// Decrease quantity by 1 (add to cart)
app.post("/products/decrease-quantity/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.quantity <= 0) return res.status(400).json({ message: "Out of stock" });

    product.quantity -= 1;
    await product.save();
    res.json({ message: "Quantity decreased", quantity: product.quantity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error decreasing quantity" });
  }
});

// Increase quantity by 1 (remove from cart)
app.post("/products/increase-quantity/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.quantity += 1;
    await product.save();
    res.json({ message: "Quantity increased", quantity: product.quantity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error increasing quantity" });
  }
});

// ----------------- Profile & Seller Routes -----------------
app.get("/seller", authMiddleware, isSeller, (req, res) => {
  res.json({ message: `Welcome Seller ${req.user.userId}` });
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const member = await Member.findById(req.user.userId).select("-password");
    if (!member) return res.status(404).json({ message: "User not found" });
    res.json({ message: `Hello ${member.name}, welcome to your profile!`, user: member });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// ----------------- Connect MongoDB & Start Server -----------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
