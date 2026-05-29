import { z } from "zod";
import { LOCALES } from "@/lib/i18n";
import { PENDING_IMAGE_PREFIX } from "@/lib/image-upload";

export const MAX_POST_TITLE = 120;
export const MAX_POST_SLUG = 140;
export const MAX_POST_CONTENT = 100_000;
export const MAX_POST_DESCRIPTION = 220;
export const MAX_POST_TAGS = 6;
export const MAX_POST_TAG_LENGTH = 24;
export const MAX_POST_THUMBNAIL_ALT = 140;
const MAX_COMMENT_LENGTH = 2000;

export type PostValidationMessages = {
	localeRequired: string;
	imageRequired: string;
	imageInvalid: string;
	tagEmpty: string;
	tagMaxLength: (max: number) => string;
	titleMin: string;
	titleMax: (max: number) => string;
	slugMax: (max: number) => string;
	slugInvalid: string;
	contentMin: string;
	contentMax: (max: number) => string;
	thumbnailAltMax: (max: number) => string;
	mainTagRequired: string;
	tagsRequired: string;
	tagsMaxItems: (max: number) => string;
	tagsUnique: string;
	descriptionMax: (max: number) => string;
};

const defaultPostValidationMessages: PostValidationMessages = {
	localeRequired: "Post language is required.",
	imageRequired: "Image is required.",
	imageInvalid: "Image must be an uploaded file path or a valid URL.",
	tagEmpty: "Tags cannot be empty.",
	tagMaxLength: (max) => `Tags must be ${max} characters or fewer.`,
	titleMin: "Title must be at least 3 characters.",
	titleMax: (max) => `Title must be ${max} characters or fewer.`,
	slugMax: (max) => `Slug must be ${max} characters or fewer.`,
	slugInvalid: "Slug can only contain lowercase letters, numbers, and hyphens.",
	contentMin: "Content must be at least 30 characters.",
	contentMax: (max) => `Content must be ${max} characters or fewer.`,
	thumbnailAltMax: (max) =>
		`Thumbnail alt text must be ${max} characters or fewer.`,
	mainTagRequired: "Main tag is required.",
	tagsRequired: "At least one tag is required.",
	tagsMaxItems: (max) => `Tags must contain ${max} items or fewer.`,
	tagsUnique: "Tags must be unique.",
	descriptionMax: (max) => `Description must be ${max} characters or fewer.`,
};

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

export function buildPostSchema(
	messages: PostValidationMessages = defaultPostValidationMessages,
) {
	const isValidImageSource = (value: string) =>
		value.startsWith("/") ||
		value.startsWith("http://") ||
		value.startsWith("https://");

	const imageSourceSchema = z
		.string()
		.trim()
		.refine((value) => !value || isValidImageSource(value), {
			message: messages.imageInvalid,
		})
		.optional()
		.default("");

	const tagSchema = z
		.string()
		.trim()
		.min(1, messages.tagEmpty)
		.max(MAX_POST_TAG_LENGTH, messages.tagMaxLength(MAX_POST_TAG_LENGTH));

	return z
		.object({
			locale: z.enum(LOCALES, {
				error: () => messages.localeRequired,
			}),
			title: z
				.string()
				.trim()
				.max(MAX_POST_TITLE, messages.titleMax(MAX_POST_TITLE))
				.optional()
				.default(""),
			slug: z
				.string()
				.trim()
				.max(MAX_POST_SLUG, messages.slugMax(MAX_POST_SLUG))
				.regex(/^(|[a-z0-9]+(?:-[a-z0-9]+)*)$/, messages.slugInvalid)
				.optional()
				.default(""),
			content: z
				.string()
				.trim()
				.max(MAX_POST_CONTENT, messages.contentMax(MAX_POST_CONTENT))
				.refine((value) => !value.includes(PENDING_IMAGE_PREFIX), {
					message: messages.imageInvalid,
				})
				.optional()
				.default(""),
			thumbnail: imageSourceSchema,
			thumbnailAlt: z
				.string()
				.trim()
				.max(
					MAX_POST_THUMBNAIL_ALT,
					messages.thumbnailAltMax(MAX_POST_THUMBNAIL_ALT),
				)
				.optional()
				.default(""),
			mainTag: z.string().trim().optional().default(""),
			tags: z
				.array(tagSchema)
				.max(MAX_POST_TAGS, messages.tagsMaxItems(MAX_POST_TAGS))
				.refine(
					(tags) =>
						new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length,
					messages.tagsUnique,
				)
				.optional()
				.default([]),
			description: z
				.string()
				.trim()
				.max(
					MAX_POST_DESCRIPTION,
					messages.descriptionMax(MAX_POST_DESCRIPTION),
				)
				.optional()
				.default(""),
			status: z.enum(["draft", "pending_review", "published"]).default("draft"),
		})
		.superRefine((post, context) => {
			if (post.status === "draft") {
				return;
			}

			if (post.title.length < 3) {
				context.addIssue({
					code: "custom",
					path: ["title"],
					message: messages.titleMin,
				});
			}

			if (post.content.length < 30) {
				context.addIssue({
					code: "custom",
					path: ["content"],
					message: messages.contentMin,
				});
			}

			if (!post.thumbnail) {
				context.addIssue({
					code: "custom",
					path: ["thumbnail"],
					message: messages.imageRequired,
				});
			}

			if (!post.mainTag) {
				context.addIssue({
					code: "custom",
					path: ["mainTag"],
					message: messages.mainTagRequired,
				});
			}

			if (post.tags.length === 0) {
				context.addIssue({
					code: "custom",
					path: ["tags"],
					message: messages.tagsRequired,
				});
			}
		});
}

export const createPostSchema = buildPostSchema();

export function buildPostTranslationSchema(
	messages: PostValidationMessages = defaultPostValidationMessages,
) {
	return z.object({
		title: z
			.string()
			.trim()
			.min(3, messages.titleMin)
			.max(MAX_POST_TITLE, messages.titleMax(MAX_POST_TITLE)),
		content: z
			.string()
			.trim()
			.min(30, messages.contentMin)
			.max(MAX_POST_CONTENT, messages.contentMax(MAX_POST_CONTENT))
			.refine((value) => !value.includes(PENDING_IMAGE_PREFIX), {
				message: messages.imageInvalid,
			}),
		description: z
			.string()
			.trim()
			.max(MAX_POST_DESCRIPTION, messages.descriptionMax(MAX_POST_DESCRIPTION))
			.optional()
			.default(""),
		thumbnailAlt: z
			.string()
			.trim()
			.max(
				MAX_POST_THUMBNAIL_ALT,
				messages.thumbnailAltMax(MAX_POST_THUMBNAIL_ALT),
			)
			.optional()
			.default(""),
	});
}

export const createPostTranslationSchema = buildPostTranslationSchema();

export const createFeedbackSchema = z.object({
	userId: nonEmptyString("User ID is required."),
	postId: nonEmptyString("Post ID is required."),
	score: z.number().int().min(0).max(5),
});

export const createProgressSchema = z.object({
	post: nonEmptyString("Post ID is required."),
	percentageRead: z.number().int().min(0).max(100),
});
