import { z } from "zod";

export const MAX_POST_TITLE = 120;
export const MAX_POST_SLUG = 140;
export const MAX_POST_CONTENT = 100_000;
export const MAX_POST_DESCRIPTION = 220;
export const MAX_POST_TAGS = 6;
export const MAX_POST_TAG_LENGTH = 24;
export const MAX_POST_THUMBNAIL_ALT = 140;
const MAX_COMMENT_LENGTH = 2000;

const nonEmptyString = (requiredMessage: string) =>
	z.string().trim().min(1, requiredMessage);

const imageSourceSchema = nonEmptyString("Image is required.").refine(
	(value) =>
		value.startsWith("/") ||
		value.startsWith("http://") ||
		value.startsWith("https://"),
	"Image must be an uploaded file path or a valid URL.",
);

const tagSchema = z
	.string()
	.trim()
	.min(1, "Tags cannot be empty.")
	.max(
		MAX_POST_TAG_LENGTH,
		`Tags must be ${MAX_POST_TAG_LENGTH} characters or fewer.`,
	);

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
	slug: z
		.string()
		.trim()
		.max(
			MAX_POST_SLUG,
			`Slug must be ${MAX_POST_SLUG} characters or fewer.`,
		)
		.regex(
			/^(|[a-z0-9]+(?:-[a-z0-9]+)*)$/,
			"Slug can only contain lowercase letters, numbers, and hyphens.",
		)
		.optional()
		.default(""),
	content: z
		.string()
		.trim()
		.min(30, "Content must be at least 30 characters.")
		.max(
			MAX_POST_CONTENT,
			`Content must be ${MAX_POST_CONTENT} characters or fewer.`,
		),
	thumbnail: imageSourceSchema,
	thumbnailAlt: z
		.string()
		.trim()
		.max(
			MAX_POST_THUMBNAIL_ALT,
			`Thumbnail alt text must be ${MAX_POST_THUMBNAIL_ALT} characters or fewer.`,
		)
		.optional()
		.default(""),
	mainTag: nonEmptyString("Main tag is required."),
	tags: z
		.array(tagSchema)
		.min(1, "At least one tag is required.")
		.max(MAX_POST_TAGS, `Tags must contain ${MAX_POST_TAGS} items or fewer.`)
		.refine(
			(tags) => new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length,
			"Tags must be unique.",
		),
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
