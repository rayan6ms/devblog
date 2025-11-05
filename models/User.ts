import mongoose from "mongoose";
import slugify from "slugify";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  profilePic: { type: String },
  bio: String,
  socialLinks: {
    twitter: String,
    linkedIn: String,
    youtube: String,
    github: String,
  },
  role: { type: String, enum: ["member","volunteer","writer","vip","admin","owner"], default: "member", index: true },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  viewedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  createdPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  editedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  pendingEditRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  approvedEditRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
}, { timestamps: true });

userSchema.pre("save", function(next) {
  if (this.isModified("username") || !this.slug) {
    this.slug = slugify(this.username, { lower: true, strict: true });
  }
  next();
});

export default mongoose.models.User ?? mongoose.model("User", userSchema);