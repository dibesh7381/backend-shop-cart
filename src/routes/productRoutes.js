import express from "express";
import { createProduct, updateProduct, deleteProduct, listProducts, sellerProducts } from "../controllers/productController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { isSeller } from "../middlewares/isSeller.js";
import { upload } from "../utils/upload.js";

const router = express.Router();

router.post("/", authMiddleware, isSeller, upload.single("file"), createProduct);
router.put("/:id", authMiddleware, isSeller, upload.single("file"), updateProduct);
router.delete("/:id", authMiddleware, isSeller, deleteProduct);
router.get("/listing", listProducts);
router.get("/seller", authMiddleware, isSeller, sellerProducts);

export default router;
