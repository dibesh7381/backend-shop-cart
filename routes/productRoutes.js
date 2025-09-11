// routes/productRoutes.js
import express from "express";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  sellerProducts
} from "../controllers/productController.js";

import { authMiddleware, isSeller } from "../middlewares/authMiddleware.js";
import upload from "../utils/multerConfig.js"; 

const router = express.Router();

// Public listing
router.get("/listing", listProducts);

// Seller-specific endpoints
router.post("/", authMiddleware, isSeller, upload.single("file"), addProduct);
router.put("/:id", authMiddleware, isSeller, upload.single("file"), updateProduct);
router.delete("/:id", authMiddleware, isSeller, deleteProduct);

// Get products for logged-in seller
router.get("/seller", authMiddleware, isSeller, sellerProducts);

export default router;
