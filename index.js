// import express from "express";
// import mongoose from "mongoose";
// import multer from "multer";
// import dotenv from "dotenv";
// import cors from "cors";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";

// dotenv.config();
// const app = express();
// app.use(cors());
// app.use(express.json());

// // ----------------- Cloudinary Setup -----------------
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // ----------------- Multer Storage -----------------
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: (req, file) => ({
//     folder: req.baseUrl && req.baseUrl.includes("profile") ? "profile_pics" : "shop_products",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     transformation: [{ width: 1000, crop: "limit" }],
//   }),
// });
// const upload = multer({ storage });

// // ----------------- MongoDB Models -----------------
// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   details: { type: String, required: true },
//   quantity: { type: Number, required: true, min: 0 },
//   category: { type: String, required: true },
//   price: { type: Number, required: true, min: 0 },
//   imageUrl: { type: String, required: true },
//   sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true }
// }, { collection: "product", versionKey: false });

// const Product = mongoose.model("Product", productSchema);

// const memberSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: { type: String, default: "customer" },
//   profilePic: { type: String, default: "" }
// }, { collection: "members", versionKey: false });

// const Member = mongoose.model("Member", memberSchema);

// // ----------------- Cart Model -----------------
// const cartSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
//   items: [
//     {
//       productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
//       quantity: { type: Number, default: 1 },
//     }
//   ],
// }, { collection: "carts", versionKey: false });

// const Cart = mongoose.model("Cart", cartSchema);

// // ----------------- Auth Middleware -----------------
// const authMiddleware = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "No token, authorization denied" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Token is not valid" });
//   }
// };

// const isSeller = (req, res, next) => {
//   if (req.user && req.user.role === "seller") return next();
//   return res.status(403).json({ message: "Access denied, only sellers allowed" });
// };

// // ----------------- Auth Routes -----------------
// app.post("/signup", async (req, res) => {
//   try {
//     const { name, email, password, role } = req.body;
//     if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

//     const existingMember = await Member.findOne({ email });
//     if (existingMember) return res.status(400).json({ message: "User already exists" });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newMember = new Member({ name : name, email : email, password: hashedPassword, role: role || "customer" });
//     await newMember.save();

//     res.status(201).json({ message: "User registered successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error registering user" });
//   }
// });

// app.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password)
//       return res.status(400).json({ message: "All fields are required" });

//     const member = await Member.findOne({ email });
//     if (!member) return res.status(400).json({ message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, member.password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign(
//       { userId: member._id, role: member.role, name: member.name },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.json({
//       message: "Login successful!",
//       token,
//       user: {
//         userId: member._id,
//         role: member.role,
//         name: member.name,
//         email: member.email,
//         profilePic: member.profilePic || ""
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // ----------------- Product Routes -----------------
// app.post("/products", authMiddleware, isSeller, upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file received" });
//     const { name, details, quantity, category, price } = req.body;
//     const product = new Product({
//       name : name,
//       details : details,
//       quantity: Number(quantity),
//       category : category,
//       price: Number(price),
//       imageUrl: req.file.path,
//       sellerId: req.user.userId
//     });
//     const saved = await product.save();
//     res.status(200).json({ message: "Product uploaded successfully", product: saved });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error uploading product" });
//   }
// });

// app.put("/products/:id", authMiddleware, isSeller, upload.single("file"), async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);
//     if (!product) return res.status(404).json({ message: "Product not found" });
//     if (product.sellerId.toString() !== req.user.userId)
//       return res.status(403).json({ message: "Access denied" });

//     const { name, details, quantity, category, price } = req.body;
//     const updateData = { name : name, details : details, quantity: Number(quantity), category : category, price: Number(price) };
//     if (req.file) updateData.imageUrl = req.file.path;

//     const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
//     res.json({ message: "Product updated successfully", product: updated });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error updating product" });
//   }
// });

// app.delete("/products/:id", authMiddleware, isSeller, async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);
//     if (!product) return res.status(404).json({ message: "Product not found" });
//     if (product.sellerId.toString() !== req.user.userId)
//       return res.status(403).json({ message: "Access denied" });

//     await Product.findByIdAndDelete(req.params.id);
//     res.json({ message: "Product deleted successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error deleting product" });
//   }
// });

// app.get("/products/listing", async (req, res) => {
//   try {
//     const products = await Product.find({}, { imageUrl: 1, price: 1, category: 1, name: 1, quantity: 1, sellerId: 1 })
//       .populate("sellerId", "name");
//     res.json(products);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error fetching products" });
//   }
// });

// // ----------------- Seller-specific Products -----------------
// app.get("/products/seller", authMiddleware, isSeller, async (req, res) => {
//   try {
//     const sellerId = req.user.userId;
//     const products = await Product.find({ sellerId })
//       .select("name details quantity category price imageUrl") // select fields you want
//       .sort({ createdAt: -1 }); // optional: latest first

//     res.json(products);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error fetching seller products" });
//   }
// });


// // ----------------- Cart Routes (Backend-driven) -----------------
// app.post("/cart/add", authMiddleware, async (req, res) => {
//   const { productId, quantity } = req.body;
//   const userId = req.user.userId;
//   try {
//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ message: "Product not found" });
//     if (product.quantity < quantity) return res.status(400).json({ message: "Not enough stock" });

//     let cart = await Cart.findOne({ userId });
//     if (!cart) cart = new Cart({ userId, items: [] });

//     const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
//     if (itemIndex > -1) {
//       cart.items[itemIndex].quantity += quantity;
//     } else {
//       cart.items.push({ productId, quantity });
//     }

//     product.quantity -= quantity;
//     await product.save();
//     await cart.save();

//     res.json({ message: "Product added to cart", cart });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Increase quantity in cart
// app.post("/cart/increase", authMiddleware, async (req, res) => {
//   const { productId } = req.body;
//   const userId = req.user.userId;
//   try {
//     const cart = await Cart.findOne({ userId });
//     if (!cart) return res.status(404).json({ message: "Cart not found" });

//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ message: "Product not found" });
//     if (product.quantity < 1) return res.status(400).json({ message: "Out of stock" });

//     const item = cart.items.find(i => i.productId.toString() === productId);
//     if (!item) return res.status(404).json({ message: "Item not in cart" });

//     item.quantity += 1;
//     product.quantity -= 1;

//     await product.save();
//     await cart.save();

//     res.json({ message: "Quantity increased", cart });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Decrease quantity in cart
// app.post("/cart/decrease", authMiddleware, async (req, res) => {
//   const { productId } = req.body;
//   const userId = req.user.userId;
//   try {
//     const cart = await Cart.findOne({ userId });
//     if (!cart) return res.status(404).json({ message: "Cart not found" });

//     const item = cart.items.find(i => i.productId.toString() === productId);
//     if (!item) return res.status(404).json({ message: "Item not in cart" });

//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ message: "Product not found" });

//     item.quantity -= 1;
//     product.quantity += 1;

//     if (item.quantity <= 0) {
//       cart.items = cart.items.filter(i => i.productId.toString() !== productId);
//     }

//     await product.save();
//     await cart.save();

//     res.json({ message: "Quantity decreased", cart });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Remove item from cart
// app.post("/cart/remove", authMiddleware, async (req, res) => {
//   const { productId } = req.body;
//   const userId = req.user.userId;
//   try {
//     const cart = await Cart.findOne({ userId });
//     if (!cart) return res.status(404).json({ message: "Cart not found" });

//     const item = cart.items.find(i => i.productId.toString() === productId);
//     if (!item) return res.status(404).json({ message: "Item not in cart" });

//     const product = await Product.findById(productId);
//     if (product) product.quantity += item.quantity;

//     cart.items = cart.items.filter(i => i.productId.toString() !== productId);

//     await product.save();
//     await cart.save();

//     res.json({ message: "Item removed", cart });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Clear entire cart
// app.post("/cart/clear", authMiddleware, async (req, res) => {
//   const userId = req.user.userId;
//   try {
//     const cart = await Cart.findOne({ userId });
//     if (!cart) return res.status(404).json({ message: "Cart not found" });

//     for (const item of cart.items) {
//       const product = await Product.findById(item.productId);
//       if (product) product.quantity += item.quantity;
//       await product.save();
//     }

//     cart.items = [];
//     await cart.save();

//     res.json({ message: "Cart cleared", cart });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get cart
// app.get("/cart", authMiddleware, async (req, res) => {
//     const userId = req.user.userId;
//   try {
//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     res.json(cart || { items: [] });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // ----------------- Profile Routes -----------------
// app.get("/profile", authMiddleware, async (req, res) => {
//   try {
//     const member = await Member.findById(req.user.userId).select("-password");
//     res.json({ user: member });
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching profile" });
//   }
// });

// app.put("/profile", authMiddleware, async (req, res) => {
//   try {
//     const { name } = req.body;
//     const updated = await Member.findByIdAndUpdate(req.user.userId, { name }, { new: true }).select("-password");
//     res.json({ user: updated });
//   } catch (err) {
//     res.status(500).json({ message: "Error updating profile" });
//   }
// });

// app.put("/profile/pic", authMiddleware, upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });
//     const updatedUser = await Member.findByIdAndUpdate(req.user.userId, { profilePic: req.file.path }, { new: true }).select("-password");
//     res.json({ user: updatedUser });
//   } catch (err) {
//     res.status(500).json({ message: "Error updating profile picture" });
//   }
// });

// // ----------------- Connect MongoDB & Start Server -----------------
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB connected"))
//   .catch(err => console.error(err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



