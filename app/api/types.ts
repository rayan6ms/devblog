import type { Types } from "mongoose";

export type PostStatus = "draft" | "pending_review" | "published";

export interface PostDTO {
  title: string;
  slug: string;
  content: string;
  author: Types.ObjectId;
  mainTag: string;
  tags: string[];
  description?: string;
  views: number;
  viewedBy: Types.ObjectId[];
  bookmarks: number;
  edited: boolean;
  editedBy?: Types.ObjectId;
  postedAt: Date;
  lastEditedAt?: Date;
  comments: Types.ObjectId[];
  status: PostStatus;
}

export interface UserDTO {
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
  role: "member" | "vip" | "admin" | "volunteer" | "writer" | "owner";
  bookmarks: Types.ObjectId[];
  viewedPosts: Types.ObjectId[];
  comments: Types.ObjectId[];
  createdPosts: Types.ObjectId[];
  editedPosts: Types.ObjectId[];
  pendingEditRequests: Types.ObjectId[];
  approvedEditRequests: Types.ObjectId[];
}

export interface CommentDTO {
  text: string;
  author: Types.ObjectId;
  post: Types.ObjectId;
  postedAt: Date;
  upvotes: number;
  downvotes: number;
}

export interface ProgressDTO {
  user: Types.ObjectId;
  post: Types.ObjectId;
  percentageRead: number;
}

export interface FeedbackDTO {
  userId: Types.ObjectId;
  postId: Types.ObjectId;
  score: -1 | 0 | 1;
}