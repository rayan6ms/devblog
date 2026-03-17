import { z } from "zod";

const MAX_POST_TITLE = 100;
const MAX_POST_CONTENT = 5000;
const MAX_POST_DESCRIPTION = 220;
const MAX_POST_TAGS = 5;
const MAX_COMMENT_LENGTH = 2000;

const nonEmptyString = (requiredMessage: string) =>
	z.string().trim().min(1, requiredMessage);

export const createCommentSchema = z.object({
	postId: nonEmptyString("Post ID is required."),
	text: z
		.string()
		.trim()
		.min(1, "Comment text is required.")
		.max(
			MAX_COMMENT_LENGTH,
			`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`,
		),
});

export const createPostSchema = z.object({
	title: z
		.string()
		.trim()
		.min(3, "Title must be at least 3 characters.")
		.max(
			MAX_POST_TITLE,
			`Title must be ${MAX_POST_TITLE} characters or fewer.`,
		),
	content: z
		.string()
		.trim()
		.min(30, "Content must be at least 30 characters.")
		.max(
			MAX_POST_CONTENT,
			`Content must be ${MAX_POST_CONTENT} characters or fewer.`,
		),
	mainTag: nonEmptyString("Main tag is required."),
	tags: z
		.array(nonEmptyString("Tags cannot be empty."))
		.min(1, "At least one tag is required.")
		.max(MAX_POST_TAGS, `Tags must contain ${MAX_POST_TAGS} items or fewer.`),
	description: z
		.string()
		.trim()
		.max(
			MAX_POST_DESCRIPTION,
			`Description must be ${MAX_POST_DESCRIPTION} characters or fewer.`,
		)
		.optional()
		.default(""),
	status: z.enum(["draft", "pending_review", "published"]).default("draft"),
});

export const createFeedbackSchema = z.object({
	userId: nonEmptyString("User ID is required."),
	postId: nonEmptyString("Post ID is required."),
	score: z.number().int().min(0).max(5),
});

export const createProgressSchema = z.object({
	user: nonEmptyString("User ID is required."),
	post: nonEmptyString("Post ID is required."),
	percentageRead: z.number().int().min(0).max(100),
});
