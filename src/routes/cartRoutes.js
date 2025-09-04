import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { addToCart, increaseCartItem, decreaseCartItem, removeCartItem, clearCart, getCart } from "../controllers/cartController.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart);
router.post("/increase", authMiddleware, increaseCartItem);
router.post("/decrease", authMiddleware, decreaseCartItem);
router.post("/remove", authMiddleware, removeCartItem);
router.post("/clear", authMiddleware, clearCart);
router.get("/", authMiddleware, getCart);

export default router;
