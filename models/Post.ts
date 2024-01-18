import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mainTag: { type: String, required: true },
  tags: [{ type: String, index: true }],
  description: String,
  views: { type: Number, default: 0 },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: { type: Number, default: 0 },
  edited: { type: Boolean, default: false },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedAt: { type: Date, default: Date.now },
  lastEditedAt: Date,
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  status: { type: String, enum: ['draft', 'pending_review', 'published'], default: 'draft' },
});

export default mongoose.models.Post ?? mongoose.model('Post', postSchema);