export type PostStatus = "draft" | "pending_review" | "published";

export interface IPost {
	title: string;
	slug: string;
	content: string;
	author: string;
	mainTag: string;
	tags: string[];
	description?: string;
	views: number;
	bookmarks: number;
	edited: boolean;
	editedBy?: string;
	postedAt: Date;
	lastEditedAt?: Date;
	status: PostStatus;
}

export interface IUser {
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
}

export interface IComment {
	text: string;
	author: string;
	post: string;
	postedAt: Date;
	upvotes: number;
	downvotes: number;
}

export interface IProgress {
	user: string;
	post: string;
	percentageRead: number;
}

export interface IFeedback {
	userId: string;
	postId: string;
	score: number;
}

export type PostDTO = IPost;
export type UserDTO = IUser;
export type CommentDTO = IComment;
export type ProgressDTO = IProgress;
export type FeedbackDTO = IFeedback;
