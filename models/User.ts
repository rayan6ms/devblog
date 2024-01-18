import mongoose from 'mongoose';
import slugify from 'slugify';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  profilePic: { type: String, validate: /^https?:\/\/\S+/ },
  bio: String,
  socialLinks: {
    twitter: { type: String, validate: /^https:\/\/twitter\.com\/[a-zA-Z0-9_]{1,15}$/ },
    linkedIn: { type: String, validate: /^https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9_-]+\/$/ },
    youtube: { type: String, validate: /^https:\/\/www\.youtube\.com\/channel\/[a-zA-Z0-9_-]+$/ },
    github: { type: String, validate: /^https:\/\/github\.com\/[a-zA-Z0-9_-]+$/ },
  },
  role: { type: String, enum: ['member', 'volunteer', 'writer', 'vip', 'admin', 'owner'], default: 'member' },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  viewedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  createdPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  editedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  pendingEditRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  approvedEditRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
});

userSchema.pre('save', async function (next) {
  if (this.isModified('username')) {
    this.slug = slugify(this.username, { lower: true, strict: true });
  }
  next();
});

export default mongoose.models.User ?? mongoose.model('User', userSchema);