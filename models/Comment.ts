import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  post:   { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  postedAt: { type: Date, default: Date.now },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Comment ?? mongoose.model("Comment", commentSchema);