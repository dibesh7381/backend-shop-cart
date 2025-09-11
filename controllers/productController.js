// controllers/productController.js
import Product from "../models/Product.js";
import cloudinary from "../utils/cloudinaryConfig.js";

export const addProduct = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });

    const { name, details, quantity, category, price } = req.body;

    const product = new Product({
      name,
      details,
      quantity: Number(quantity),
      category,
      price: Number(price),
      imageUrl: req.file.path,          // Cloudinary URL
      imagePublicId: req.file.filename, // public_id from multer-storage-cloudinary
      sellerId: req.user.userId
    });

    const saved = await product.save();
    res.status(200).json({ message: "Product uploaded successfully", product: saved });
  } catch (err) {
    console.error("Product upload error:", err);
    res.status(500).json({ message: "Error uploading product" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Access denied" });

    const { name, details, quantity, category, price } = req.body;
    const updateData = {
      name: name,
      details: details,
      quantity: Number(quantity),
      category: category,
      price: Number(price)
    };

    // If new file uploaded, update imageUrl (and you may also update imagePublicId if you want)
    if (req.file) {
      updateData.imageUrl = req.file.path;
      // OPTIONAL (recommended): updateData.imagePublicId = req.file.filename;
      // If you don't update imagePublicId, old public_id stays and delete may remove wrong file later.
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: "Product updated successfully", product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Access denied" });

    if (product.imagePublicId) {
      // destroy from Cloudinary
      await cloudinary.uploader.destroy(product.imagePublicId);
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Product & image deleted successfully" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Error deleting product" });
  }
};

export const listProducts = async (req, res) => {
  try {
    const products = await Product.find(
      {},
      { imageUrl: 1, price: 1, category: 1, name: 1, quantity: 1, sellerId: 1 }
    ).populate("sellerId", "name");
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching products" });
  }
};

export const sellerProducts = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const products = await Product.find({ sellerId })
      .select("name details quantity category price imageUrl")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching seller products" });
  }
};
