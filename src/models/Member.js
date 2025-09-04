import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "customer" },
  profilePic: { type: String, default: "" }
}, { collection: "members", versionKey: false });

export default mongoose.model("Member", memberSchema);

