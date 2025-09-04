import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { addToCart, increaseQuantity, decreaseQuantity, removeItem, clearCart, getCart } from "../controllers/cartController.js";

const router = express.Router();

// Add item
router.post("/add", authMiddleware, addToCart);

// Increase quantity
router.post("/increase", authMiddleware, increaseQuantity);

// Decrease quantity
router.post("/decrease", authMiddleware, decreaseQuantity);

// Remove item
router.post("/remove", authMiddleware, removeItem);

// Clear cart
router.post("/clear", authMiddleware, clearCart);

// Get cart
router.get("/", authMiddleware, getCart);

export default router;
