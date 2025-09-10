import Product from "../models/Product.js";

export const createProduct = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file received" });

    const { name, details, quantity, category, price } = req.body;
    const product = new Product({
      name,
      details,
      quantity: Number(quantity),
      category,
      price: Number(price),
      imageUrl: req.file.path,
      sellerId: req.user.userId
    });

    const saved = await product.save();
    res.status(201).json({ message: "Product uploaded successfully", product: saved });
  } catch (err) {
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
    const updateData = { name, details, quantity: Number(quantity), category, price: Number(price) };
    if (req.file) updateData.imageUrl = req.file.path;

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: "Product updated successfully", product: updated });
  } catch (err) {
    res.status(500).json({ message: "Error updating product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.sellerId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Access denied" });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product" });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}, { imageUrl: 1, price: 1, category: 1, name: 1, quantity: 1, sellerId: 1 })
      .populate("sellerId", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products" });
  }
};

export const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.userId })
      .select("name details quantity category price imageUrl")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching seller products" });
  }
};
