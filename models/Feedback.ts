import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  // -1 = wantLess, 0 = neutral, 1 = wantMore
  score: { type: Number, enum: [-1, 0, 1], default: 0 },
}, { timestamps: true });

feedbackSchema.index({ userId: 1, postId: 1 }, { unique: true });

export default mongoose.models.Feedback ?? mongoose.model("Feedback", feedbackSchema);