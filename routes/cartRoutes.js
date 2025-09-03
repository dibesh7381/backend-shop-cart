import express from "express";
import { addToCart, getCart, removeFromCart } from "../controllers/cartController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Add product to cart
router.post("/add", authMiddleware, addToCart);

// Get user cart
router.get("/", authMiddleware, getCart);

// Remove product from cart
router.delete("/remove/:productId", authMiddleware, removeFromCart);

export default router;
