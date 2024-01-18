import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  wantMore: Boolean,
  wantLess: Boolean,
  timestamp: Date,
});

export default mongoose.models.Feedback ?? mongoose.model('Feedback', feedbackSchema);