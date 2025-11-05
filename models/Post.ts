import mongoose from "mongoose";
import slugify from "slugify";

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true }, // Markdown
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mainTag: { type: String, required: true, index: true },
  tags: [{ type: String, index: true }],
  description: String,

  // engagement
  views: { type: Number, default: 0, index: true },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: { type: Number, default: 0 },

  // editorial
  edited: { type: Boolean, default: false },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  postedAt: { type: Date, default: Date.now },
  lastEditedAt: Date,

  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  status: { type: String, enum: ["draft", "pending_review", "published"], default: "draft", index: true },
}, { timestamps: true });

postSchema.pre("save", function(next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ status: 1, postedAt: -1, views: -1 });

export default mongoose.models.Post ?? mongoose.model("Post", postSchema);
