import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "customer" },
  profilePic: { type: String, default: "" }
}, { collection: "members", versionKey: false });

export default mongoose.model("Member", memberSchema);
