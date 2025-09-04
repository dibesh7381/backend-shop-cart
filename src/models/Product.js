import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  details: String,
  quantity: { type: Number, min: 0 },
  category: String,
  price: { type: Number, min: 0 },
  imageUrl: String,
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" }
}, { collection: "product", versionKey: false });

export default mongoose.model("Product", productSchema);
