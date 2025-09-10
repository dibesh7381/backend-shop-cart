import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
  getCart
} from "../controllers/cartController.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart);
router.post("/increase", authMiddleware, increaseQuantity);
router.post("/decrease", authMiddleware, decreaseQuantity);
router.post("/remove", authMiddleware, removeItem);
router.post("/clear", authMiddleware, clearCart);
router.get("/", authMiddleware, getCart);

export default router;
