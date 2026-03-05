export type PostStatus = "draft" | "pending_review" | "published";

export interface PostDTO {
	title: string;
	slug: string;
	content: string;
	author: string;
	mainTag: string;
	tags: string[];
	description?: string;
	views: number;
	viewedBy: string[];
	bookmarks: number;
	edited: boolean;
	editedBy?: string;
	postedAt: Date;
	lastEditedAt?: Date;
	comments: string[];
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
	bookmarks: string[];
	viewedPosts: string[];
	comments: string[];
	createdPosts: string[];
	editedPosts: string[];
	pendingEditRequests: string[];
	approvedEditRequests: string[];
}

export interface CommentDTO {
	text: string;
	author: string;
	post: string;
	postedAt: Date;
	upvotes: number;
	downvotes: number;
}

export interface ProgressDTO {
	user: string;
	post: string;
	percentageRead: number;
}

export interface FeedbackDTO {
	userId: string;
	postId: string;
	score: number;
}
