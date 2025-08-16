import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json()); // parse JSON for PATCH requests

// Make sure uploads folder exists
const uploadFolder = "uploads";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

// ----------------- MongoDB Model -----------------
const productSchema = new mongoose.Schema({
  name: String,
  details: String,
  quantity: Number,
  category: String,
  price: Number,        // ✅ price added
  imageUrl: String,
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

// ----------------- Routes -----------------

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
      price: Number(price),          // ✅ save price
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

// ----------------- Connect to MongoDB -----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));


  
// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
