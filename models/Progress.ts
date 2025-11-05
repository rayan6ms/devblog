import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  percentageRead: { type: Number, required: true, min: 0, max: 100 },
}, { timestamps: true });

progressSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.models.Progress ?? mongoose.model("Progress", progressSchema);