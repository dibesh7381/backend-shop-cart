import express from "express";
import { authMiddleware, isSeller } from "../middleware/authMiddleware.js";
import { upload } from "../utils/upload.js";
import { addProduct, updateProduct, deleteProduct, getAllProducts, getSellerProducts } from "../controllers/productController.js";

const router = express.Router();

router.post("/", authMiddleware, isSeller, upload.single("file"), addProduct);
router.put("/:id", authMiddleware, isSeller, upload.single("file"), updateProduct);
router.delete("/:id", authMiddleware, isSeller, deleteProduct);
router.get("/listing", getAllProducts);
router.get("/seller", authMiddleware, isSeller, getSellerProducts);

export default router;
