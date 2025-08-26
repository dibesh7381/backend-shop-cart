
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
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for general uploads (products) and profile pics (we'll use same storage but different folder param)
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // Use different folders based on route or fieldname if needed
    // For profile uploads fieldname is likely "file", we will route by URL in endpoint
    return {
      folder: req.baseUrl && req.baseUrl.includes("profile") ? "profile_pics" : "shop_products",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1000, crop: "limit" }], // limit size to avoid huge files
    };
  },
});
const upload = multer({ storage });

// ----------------- MongoDB Models -----------------
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true }
}, { collection: "product", versionKey: false });

const Product = mongoose.model("Product", productSchema);

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "customer" },
  profilePic: { type: String, default: "" } // <-- added profile picture URL
}, { collection: "members", versionKey: false });

const Member = mongoose.model("Member", memberSchema);

// ----------------- Cart Model -----------------
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, min: 1 },
    }
  ]
}, { collection: "carts", versionKey: false });

const Cart = mongoose.model("Cart", cartSchema);

// ----------------- Cart Routes -----------------

// Get logged-in user's cart
app.get("/cart", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId }).populate("items.productId");
    res.json(cart || { userId: req.user.userId, items: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching cart" });
  }
});

// Add product to cart (or increase quantity)
app.post("/cart/add", authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: "ProductId and quantity required" });

    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = new Cart({ userId: req.user.userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(i => i.productId.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    res.json({ message: "Item added to cart", cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding to cart" });
  }
});

// Update quantity of an item
app.put("/cart/update/:productId", authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(i => i.productId.toString() === req.params.productId);
    if (!item) return res.status(404).json({ message: "Item not in cart" });

    item.quantity = quantity;
    await cart.save();
    res.json({ message: "Cart updated", cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating cart" });
  }
});

// Remove item from cart
app.delete("/cart/remove/:productId", authMiddleware, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(i => i.productId.toString() !== req.params.productId);
    await cart.save();
    res.json({ message: "Item removed", cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing item from cart" });
  }
});

// Clear entire cart
app.delete("/cart/clear", authMiddleware, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.user.userId });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error clearing cart" });
  }
});


// ----------------- Signup -----------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    const existingMember = await Member.findOne({ email });
    if (existingMember) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMember = new Member({ name: name, email: email, password: hashedPassword, role: role || "customer", profilePic: "" });
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

    const token = jwt.sign(
      { userId: member._id, role: member.role, name: member.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: {
        userId: member._id,
        role: member.role,
        name: member.name,
        email: member.email,
        profilePic: member.profilePic || "" // <-- return profilePic
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

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

// ----------------- Role Middleware only for seller -----------------
const isSeller = (req, res, next) => {
  if (req.user && req.user.role === "seller") {
      return next()
  }
  return res.status(403).json({ message: "Access denied, only sellers allowed" });
};

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
      imageUrl: req.file.path,
      sellerId: req.user.userId
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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Access denied" });

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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Access denied" });

    await Product.findByIdAndDelete(req.params.id);

    if (product.imageUrl) {
      // Attempt to cleanup Cloudinary resource if path contains upload
      try {
        const publicIdPart = product.imageUrl.split("/upload/")[1];
        if (publicIdPart) {
          const publicId = publicIdPart.replace(/\..+$/, "").split("/").slice(1).join("/");
          if (publicId) {
            cloudinary.uploader.destroy(publicId, (err, result) => err ? console.error(err) : console.log("Cloudinary delete:", result));
          }
        }
      } catch (e) {
        console.warn("Could not derive publicId to delete from Cloudinary URL:", e);
      }
    }

    res.json({ message: "Product and image deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting product" });
  }
});

// This is for individual seller if login 
app.get("/products/seller", authMiddleware, isSeller, async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.userId });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching seller products" });
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

// Get products for listing with seller name
app.get("/products/listing", async (req, res) => {
  try {
    // Populate sellerId field with name only
    const products = await Product.find(
      {},
      { imageUrl: 1, price: 1, category: 1, name: 1, quantity: 1, sellerId: 1 }
    ).populate("sellerId", "name"); // populate name of seller
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

// remove all item from cart and increse quantity by based on selected stocks
app.post("/products/increase-many", authMiddleware, async (req, res) => {
  try {
    const items = req.body.items; // [{id: 123, quantity: 3}, {id: 456, quantity: 2}]
    for (const item of items) {
      await Product.findByIdAndUpdate(item.id, { $inc: { quantity: item.quantity } });
    }
    res.json({ message: "Stock restored for all items" });
  } catch (err) {
    res.status(500).json({ message: "Error restoring stock" });
  }
});

// ----------------- Profile & Seller Routes -----------------

// Get profile
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

// Update basic profile (e.g., name)
app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const updated = await Member.findByIdAndUpdate(req.user.userId, { name }, { new: true }).select("-password");
    res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile" });
  }
});

// Upload/update profile picture
// Use same upload middleware (CloudinaryStorage). This will save file to cloudinary and req.file.path will be secure URL.
app.put("/profile/pic", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const updatedUser = await Member.findByIdAndUpdate(
      req.user.userId,
      { profilePic: req.file.path },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile picture updated!", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile picture" });
  }
});

// ----------------- Connect MongoDB & Start Server -----------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

