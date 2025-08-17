import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json()); // parse JSON for PATCH requests

// Make sure uploads folder exists
const uploadFolder = "uploads";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

// ----------------- MongoDB Model -----------------
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true }
}, { collection: "product", versionKey: false });

const Product = mongoose.model("Product", productSchema);

// ----------------- Multer Setup -----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ----------------- Serve uploads folder -----------------
app.use("/uploads", express.static(uploadFolder));



// Upload product
app.post("/products", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });
    if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ message: "Only images are allowed" });

    const { name, details, quantity, category, price } = req.body;
    const product = new Product({
      name,
      details,
      quantity: Number(quantity),
      category,
      price: Number(price),         
      imageUrl: `/uploads/${req.file.filename}`
    });

    const saved = await product.save();
    res.status(200).json({ message: "Product uploaded successfully", product: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading product" });
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

// Update product
app.put("/products/:id", upload.single("file"), async (req, res) => {
  try {
    const { name, details, quantity, category, price } = req.body;
    const updateData = {
      name,
      details,
      quantity: Number(quantity),
      category,
      price: Number(price),       // ✅ update price
    };
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: "Product updated successfully", product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating product" });
  }
});

// Delete product
app.delete("/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });

    if (deleted.imageUrl) {
      const filePath = path.join(process.cwd(), deleted.imageUrl.replace("/", path.sep));
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting product" });
  }
});



// ----------------- Increment / Decrement Quantity -----------------
app.patch("/products/:id/quantity", async (req, res) => {
  try {
    const { action } = req.body; // "increment" or "decrement"
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (action === "increment") product.quantity += 1;
    else if (action === "decrement" && product.quantity > 0) product.quantity -= 1;

    await product.save();
    res.json({ message: "Quantity updated", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating quantity" });
  }
});


// ----------------- User Model -----------------
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true } // hashed password
}, { collection: "members", versionKey: false }); // <- new collection name

const Member = mongoose.model("Member", memberSchema);

// ----------------- Signup -----------------
// ----------------- Signup -----------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingMember = await Member.findOne({ email });
    if (existingMember)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMember = new Member({ name, email, password: hashedPassword });
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
    if (!email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const member = await Member.findOne({ email });
    if (!member) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: member._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: member._id, name: member.name, email: member.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error logging in" });
  }
});

// ----------------- Auth Middleware -----------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains userId
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};


// ----------------- Get products for listing (only image + price) -----------------
// Get product listing (protected)
app.get("/products/listing", async (req, res) => {
  try {
    // imageUrl, price, category aur name return
    const products = await Product.find(
      {},
      { imageUrl: 1, price: 1, category: 1, name: 1, _id: 1 }
    );
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching products for listing" });
  }
});



// ----------------- Profile with Message -----------------
app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const member = await Member.findById(req.user.userId).select("-password");
    if (!member) return res.status(404).json({ message: "User not found" });

    res.json({
      message: `Hello ${member.name}, welcome to your profile!`,
      user: member,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});


// ----------------- Connect to MongoDB -----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));


  
// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

