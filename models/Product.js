import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true },
  imagePublicId: { type: String, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true }
}, { collection: "product", versionKey: false });

const Product = mongoose.model("Product", productSchema);
export default Product;
