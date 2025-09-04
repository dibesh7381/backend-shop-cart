import express from "express";
import { authMiddleware, isSeller } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";
import { addProduct, updateProduct, deleteProduct, listProducts, sellerProducts } from "../controllers/productController.js";

const router = express.Router();

// Add product
router.post("/", authMiddleware, isSeller, upload.single("file"), addProduct);

// Update product
router.put("/:id", authMiddleware, isSeller, upload.single("file"), updateProduct);

// Delete product
router.delete("/:id", authMiddleware, isSeller, deleteProduct);

// List all products
router.get("/listing", listProducts);

// List seller's products
router.get("/seller", authMiddleware, isSeller, sellerProducts);

export default router;
