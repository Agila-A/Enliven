import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }
});

export default mongoose.model("Badge", badgeSchema);
