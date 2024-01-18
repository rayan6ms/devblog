import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  percentageRead: { type: Number, required: true },
});

export default mongoose.models.Progress ?? mongoose.model('Progress', progressSchema);