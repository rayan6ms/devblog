import { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: Schema.Types.ObjectId;
  mainTag: string;
  tags: string[];
  description?: string;
  views: number;
  viewedBy: Schema.Types.ObjectId[];
  bookmarks: number;
  edited: boolean;
  editedBy?: Schema.Types.ObjectId;
  postedAt: Date;
  lastEditedAt?: Date;
  comments: Schema.Types.ObjectId[];
  status: 'draft' | 'pending_review' | 'published';
}

export interface IUser extends Document {
  username: string;
  slug: string;
  profilePic?: string;
  bio?: string;
  socialLinks: {
    twitter?: string;
    linkedIn?: string;
    youtube?: string;
    github?: string;
  };
  role: 'member' | 'vip' | 'admin' | 'volunteer';
  bookmarks: Schema.Types.ObjectId[];
  viewedPosts: Schema.Types.ObjectId[];
  comments: Schema.Types.ObjectId[];
  createdPosts: Schema.Types.ObjectId[];
  editedPosts: Schema.Types.ObjectId[];
  pendingEditRequests: Schema.Types.ObjectId[];
  approvedEditRequests: Schema.Types.ObjectId[];
}

export interface IComment extends Document {
  text: string;
  author: Schema.Types.ObjectId;
  postedAt: Date;
  upvotes: number;
  downvotes: number;
}

export interface IProgress extends Document {
  user: Schema.Types.ObjectId;
  post: Schema.Types.ObjectId;
  percentageRead: number;
}

export interface IFeedback extends Document {
  userId: Schema.Types.ObjectId;
  postId: Schema.Types.ObjectId;
  wantMore: boolean;
  wantLess: boolean;
  timestamp: Date;
}