"use client";

import type React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import {
	FaArrowsRotate,
	FaCircleCheck,
	FaClock,
	FaFileLines,
	FaImage,
	FaLink,
	FaPaperPlane,
	FaPenNib,
	FaTags,
} from "react-icons/fa6";
import type { z } from "zod";
import CircleProgress from "./CircleProgress";
import MainTagInput from "./MainTagInput";
import MarkdownEditor from "./MarkdownEditor";
import TagsInput from "./TagsInput";
import {
	createPostSchema,
	MAX_POST_CONTENT,
	MAX_POST_DESCRIPTION,
	MAX_POST_SLUG,
	MAX_POST_THUMBNAIL_ALT,
	MAX_POST_TITLE,
} from "@/lib/validation/content";
import {
	getReadingTimeMinutes,
	slugifyPostValue,
	stripMarkdown,
} from "@/lib/post-shared";

type PostFormData = z.input<typeof createPostSchema>;
type PostStatus = "draft" | "pending_review" | "published";
type Mode = "create" | "edit";

type FormProps = {
	mainTagsOptions: string[];
	mode?: Mode;
	initialValues?: Partial<PostFormData> & {
		authorName?: string;
	};
	existingSlug?: string;
};

type UploadResponse = {
	url: string;
	name: string;
	size: number;
};

type SubmitState = {
	tone: "error" | "success" | null;
	message: string;
};

const STATUS_DETAILS: Record<
	PostStatus,
	{ label: string; description: string }
> = {
	draft: {
		label: "Save draft",
		description: "Keep the post private while you shape the content.",
	},
	pending_review: {
		label: "Send to review",
		description: "Mark the draft as ready for editorial review.",
	},
	published: {
		label: "Publish now",
		description: "Make the post visible on the site immediately.",
	},
};

export default function Form({
	mainTagsOptions,
	mode = "create",
	initialValues,
	existingSlug,
}: FormProps) {
	const router = useRouter();
	const [submitState, setSubmitState] = useState<SubmitState>({
		tone: null,
		message: "",
	});
	const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
	const [thumbnailMessage, setThumbnailMessage] = useState("");
	const [slugTouched, setSlugTouched] = useState(
		Boolean(initialValues?.slug?.trim()),
	);

	const {
		control,
		handleSubmit,
		register,
		reset,
		setError,
		clearErrors,
		setValue,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<PostFormData>({
		resolver: zodResolver(createPostSchema),
		defaultValues: {
			title: initialValues?.title ?? "",
			slug: initialValues?.slug ?? "",
			content: initialValues?.content ?? "",
			thumbnail: initialValues?.thumbnail ?? "",
			thumbnailAlt: initialValues?.thumbnailAlt ?? "",
			description: initialValues?.description ?? "",
			mainTag: initialValues?.mainTag ?? "",
			tags: initialValues?.tags ?? [],
			status: initialValues?.status ?? "draft",
		},
	});

	const title = watch("title");
	const slug = watch("slug");
	const description = watch("description") || "";
	const content = watch("content") || "";
	const tags = watch("tags") || [];
	const mainTag = watch("mainTag") || "";
	const status = watch("status") || "draft";
	const thumbnail = watch("thumbnail") || "";
	const thumbnailAlt = watch("thumbnailAlt") || "";
	const titleLength = title?.length || 0;
	const descriptionLength = description.length;
	const thumbnailAltLength = thumbnailAlt.length;
	const wordCount = useMemo(
		() => stripMarkdown(content).split(" ").filter(Boolean).length,
		[content],
	);
	const readingTime = useMemo(() => getReadingTimeMinutes(content), [content]);

	useEffect(() => {
		if (slugTouched) {
			return;
		}

		setValue("slug", slugifyPostValue(title).slice(0, MAX_POST_SLUG), {
			shouldValidate: true,
		});
	}, [slugTouched, title, setValue]);

	async function uploadImage(file: File): Promise<UploadResponse> {
		const body = new FormData();
		body.append("file", file);

		const response = await fetch("/api/upload", {
			method: "POST",
			body,
		});

		const data = (await response.json().catch(() => null)) as
			| UploadResponse
			| { error?: string }
			| null;

		if (!response.ok || !data || typeof data !== "object" || !("url" in data)) {
			const message =
				data && "error" in data && typeof data.error === "string"
					? data.error
					: "Unable to upload the image.";
			throw new Error(
				message,
			);
		}

		return data;
	}

	async function handleThumbnailSelected(
		event: React.ChangeEvent<HTMLInputElement>,
	) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		setIsThumbnailUploading(true);
		setThumbnailMessage("");

		try {
			const upload = await uploadImage(file);
			setValue("thumbnail", upload.url, { shouldValidate: true });
			clearErrors("thumbnail");
			if (!thumbnailAlt.trim()) {
				setValue(
					"thumbnailAlt",
					upload.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
					{ shouldValidate: true },
				);
			}
			setThumbnailMessage("Thumbnail uploaded.");
		} catch (error) {
			setError("thumbnail", {
				type: "manual",
				message:
					error instanceof Error
						? error.message
						: "Unable to upload thumbnail.",
			});
			setThumbnailMessage("");
		} finally {
			setIsThumbnailUploading(false);
			event.target.value = "";
		}
	}

	function applyServerFieldErrors(
		fields: Partial<Record<keyof PostFormData, string[] | undefined>> | undefined,
	) {
		if (!fields) {
			return;
		}

		for (const [fieldName, messages] of Object.entries(fields)) {
			if (!messages?.length) {
				continue;
			}

			setError(fieldName as FieldPath<PostFormData>, {
				type: "server",
				message: messages[0],
			});
		}
	}

	async function submitPost(nextStatus: PostStatus) {
		setValue("status", nextStatus, { shouldValidate: true });

		await handleSubmit(async (data) => {
			setSubmitState({ tone: null, message: "" });
			clearErrors();

			const response = await fetch(
				mode === "edit" && existingSlug
					? `/api/post/${existingSlug}`
					: "/api/post",
				{
					method: mode === "edit" ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...data, status: nextStatus }),
				},
			);

			const result = (await response.json().catch(() => null)) as
				| {
						error?: string;
						fields?: Partial<Record<keyof PostFormData, string[] | undefined>>;
						slug?: string;
				  }
				| null;

			if (!response.ok) {
				applyServerFieldErrors(result?.fields);
				setSubmitState({
					tone: "error",
					message:
						result?.error ||
						"Unable to save the post right now. Please try again.",
				});
				return;
			}

			setSubmitState({
				tone: "success",
				message:
					nextStatus === "published"
						? "Post published."
						: nextStatus === "pending_review"
							? "Post sent to review."
							: "Draft saved.",
			});

			if (result?.slug) {
				router.push(`/post/${result.slug}`);
				router.refresh();
			}
		})();
	}

	const checklist = [
		{ label: "Title set", done: title.trim().length >= 3 },
		{ label: "Thumbnail uploaded", done: Boolean(thumbnail) },
		{ label: "Main tag chosen", done: Boolean(mainTag.trim()) },
		{ label: "Supporting tags added", done: tags.length > 0 },
		{ label: "Description ready", done: description.trim().length >= 20 },
		{ label: "Body has substance", done: content.trim().length >= 120 },
	];

	return (
		<form className="w-full" onSubmit={(event) => event.preventDefault()}>
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="grid gap-6">
					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10 sm:p-7">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="min-w-0">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
										<FaPenNib />
									</div>
									<div>
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{mode === "edit" ? "Edit post" : "New post"}
										</p>
										<h2 className="mt-2 text-3xl font-somerton text-wheat">
											{mode === "edit"
												? "Refine the published shape"
												: "Build the post before it ships"}
										</h2>
									</div>
								</div>
								<p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
									The editor persists real markdown, real media paths, and real
									post metadata to Prisma. What you preview here is what renders
									on the post page.
								</p>
							</div>

							<div className="rounded-[24px] border border-zinc-700/60 bg-darkBg/45 px-4 py-3 text-right">
								<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
									Mode
								</p>
								<p className="mt-1 text-lg font-semibold text-zinc-100">
									{mode === "edit" ? "Editing" : "Creating"}
								</p>
								<p className="mt-1 text-sm text-zinc-500">
									{initialValues?.authorName || "Author"}
								</p>
							</div>
						</div>

						{submitState.message ? (
							<div
								className={`mt-5 rounded-[22px] border px-4 py-3 text-sm ${
									submitState.tone === "error"
										? "border-red-500/25 bg-red-500/10 text-red-200"
										: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
								}`}
							>
								{submitState.message}
							</div>
						) : null}
					</section>

					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10 sm:p-7">
						<div className="mb-5 flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
								<FaFileLines />
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
									Story setup
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									Lock the metadata first
								</h3>
							</div>
						</div>
						<div className="grid gap-5">
							<label className="block">
								<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									<FaPenNib className="text-xs text-zinc-500" />
									<span>Title</span>
								</div>
								<input
									type="text"
									{...register("title")}
									maxLength={MAX_POST_TITLE}
									className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder="A title that deserves the click"
								/>
								<div className="mt-2 flex items-center justify-between">
									<p className="text-sm text-red-400">{errors.title?.message}</p>
									<CircleProgress
										size={26}
										progress={(MAX_POST_TITLE - titleLength) / MAX_POST_TITLE}
										remaining={MAX_POST_TITLE - titleLength}
									/>
								</div>
							</label>

							<label className="block">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										<FaLink className="text-xs text-zinc-500" />
										<span>Slug</span>
									</div>
									<button
										type="button"
										onClick={() => {
											setSlugTouched(false);
											setValue(
												"slug",
												slugifyPostValue(title).slice(0, MAX_POST_SLUG),
												{ shouldValidate: true },
											);
										}}
										className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-wheat"
									>
										<FaArrowsRotate className="text-xs" />
										Regenerate
									</button>
								</div>
								<input
									type="text"
									{...register("slug", {
										onChange: () => setSlugTouched(true),
									})}
									maxLength={MAX_POST_SLUG}
									className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder="post-url-slug"
								/>
								<p className="mt-2 text-sm text-zinc-500">
									Final URL: <span className="text-zinc-300">/post/{slug || "post-url-slug"}</span>
								</p>
								<p className="mt-1 text-sm text-red-400">{errors.slug?.message}</p>
							</label>

							<label className="block">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										<FaFileLines className="text-xs text-zinc-500" />
										<span>Description</span>
									</div>
									<button
										type="button"
										onClick={() => {
											const generated = stripMarkdown(content).slice(0, 220);
											setValue("description", generated, { shouldValidate: true });
										}}
										className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-wheat"
									>
										<FaArrowsRotate className="text-xs" />
										Generate from content
									</button>
								</div>
								<textarea
									{...register("description")}
									maxLength={MAX_POST_DESCRIPTION}
									rows={3}
									className="mt-2 w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/55 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder="What should the reader understand before opening the article?"
								/>
								<div className="mt-2 flex items-center justify-between">
									<p className="text-sm text-red-400">
										{errors.description?.message}
									</p>
									<span className="text-sm text-zinc-500">
										{descriptionLength}/{MAX_POST_DESCRIPTION}
									</span>
								</div>
							</label>
						</div>
					</section>

					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10 sm:p-7">
						<div className="mb-5 flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
								<FaImage />
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
									Visuals
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									Set the post thumbnail
								</h3>
							</div>
						</div>
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
							<div>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0">
										<p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
											<FaImage className="text-xs text-zinc-500" />
											<span>Thumbnail</span>
										</p>
										<p className="mt-2 text-sm leading-6 text-zinc-500">
											This drives the hero image on the post page and the card
											thumbnail everywhere else.
										</p>
									</div>

									<label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-purpleContrast/35 bg-purpleContrast/18 px-4 py-2 text-sm font-semibold text-wheat transition-colors hover:bg-purpleContrast/26 sm:shrink-0">
										<input
											type="file"
											accept="image/jpeg,image/png,image/webp,image/gif"
											className="hidden"
											onChange={handleThumbnailSelected}
										/>
										<FaImage className="text-sm" />
										{isThumbnailUploading ? "Uploading..." : "Upload"}
									</label>
								</div>

								<input type="hidden" {...register("thumbnail")} />
								{thumbnail ? (
									<div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-700/50 bg-darkBg/45">
										<img
											src={thumbnail}
											alt={thumbnailAlt || "Post thumbnail"}
											className="aspect-[16/10] w-full object-cover"
										/>
									</div>
								) : (
									<div className="mt-4 flex aspect-[16/10] items-center justify-center rounded-[24px] border border-dashed border-zinc-700/60 bg-darkBg/30 text-center text-zinc-500">
										Upload the image that should represent the post.
									</div>
								)}
								<p className="mt-3 text-sm text-red-400">{errors.thumbnail?.message}</p>
								{thumbnailMessage ? (
									<p className="mt-1 text-sm text-emerald-400">{thumbnailMessage}</p>
								) : null}
							</div>

							<label className="block">
								<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									<FaLink className="text-xs text-zinc-500" />
									<span>Thumbnail Alt Text</span>
								</div>
								<textarea
									{...register("thumbnailAlt")}
									maxLength={MAX_POST_THUMBNAIL_ALT}
									rows={5}
									className="mt-2 w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/55 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder="Describe the thumbnail for accessibility and previews"
								/>
								<div className="mt-2 flex items-center justify-between">
									<p className="text-sm text-red-400">
										{errors.thumbnailAlt?.message}
									</p>
									<span className="text-sm text-zinc-500">
										{thumbnailAltLength}/{MAX_POST_THUMBNAIL_ALT}
									</span>
								</div>
							</label>
						</div>
					</section>

					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10 sm:p-7">
						<div className="mb-5 flex items-center justify-between gap-4">
							<div className="min-w-0">
								<div className="flex items-center gap-3">
									<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
										<FaPenNib />
									</div>
									<div>
										<p className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
											Body
										</p>
										<h3 className="mt-1 text-lg font-semibold text-zinc-100">
											Write and review in one place
										</h3>
									</div>
								</div>
								<p className="mt-2 text-sm leading-6 text-zinc-500">
									Write in markdown, upload inline images, and verify the final
									render before saving.
								</p>
							</div>
							<div className="rounded-[22px] border border-zinc-700/60 bg-darkBg/45 px-4 py-3 text-right sm:shrink-0">
								<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
									<FaClock className="mr-2 inline text-xs" />
									Read time
								</p>
								<p className="mt-1 text-lg font-semibold text-zinc-100">
									{readingTime} min
								</p>
							</div>
						</div>

						<Controller
							control={control}
							name="content"
							render={({ field }) => (
								<MarkdownEditor
									value={field.value || ""}
									onChange={field.onChange}
									maxLength={MAX_POST_CONTENT}
									disabled={isSubmitting}
									onUploadImage={uploadImage}
								/>
							)}
						/>
						<div className="mt-3 flex items-center justify-between">
							<p className="text-sm text-red-400">{errors.content?.message}</p>
							<CircleProgress
								size={26}
								progress={
									(MAX_POST_CONTENT - Math.max(0, content.length)) /
									MAX_POST_CONTENT
								}
								remaining={MAX_POST_CONTENT - content.length}
							/>
						</div>
					</section>
				</div>

				<aside className="grid gap-6 xl:sticky xl:top-24 xl:self-start">
					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
								<FaTags />
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
									Taxonomy
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									Place the article
								</h3>
							</div>
						</div>

						<div className="mt-5 grid gap-5">
							<div>
								<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									Main tag
								</span>
								<Controller
									control={control}
									name="mainTag"
									render={({ field }) => (
										<div className="mt-2">
											<MainTagInput
												suggestions={mainTagsOptions}
												value={field.value || ""}
												onChange={field.onChange}
											/>
										</div>
									)}
								/>
								<p className="mt-2 text-sm text-red-400">
									{errors.mainTag?.message}
								</p>
							</div>

							<div>
								<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									Tags
								</span>
								<Controller
									control={control}
									name="tags"
									render={({ field }) => (
										<div className="mt-2">
											<TagsInput value={field.value || []} onChange={field.onChange} />
										</div>
									)}
								/>
								<p className="mt-2 text-sm text-red-400">{errors.tags?.message}</p>
							</div>
						</div>
					</section>

					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
								<FaCircleCheck />
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
									Readiness
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									Check the essentials
								</h3>
							</div>
						</div>
						<div className="mt-5 grid gap-3">
							{checklist.map((item) => (
								<div
									key={item.label}
									className="flex items-center justify-between rounded-[18px] border border-zinc-700/50 bg-darkBg/45 px-4 py-3 text-sm"
								>
									<span className="text-zinc-300">{item.label}</span>
									<span
										className={
											item.done ? "text-emerald-400" : "text-zinc-500"
										}
									>
										{item.done ? "Ready" : "Missing"}
									</span>
								</div>
							))}
						</div>

						<div className="mt-5 rounded-[22px] border border-zinc-700/50 bg-darkBg/45 p-4 text-sm text-zinc-400">
							<p>{wordCount} words</p>
							<p className="mt-2">{tags.length} tags attached</p>
							<p className="mt-2 capitalize">Current target: {status.replace("_", " ")}</p>
						</div>
					</section>

					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
								<FaPaperPlane />
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
									Publish
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									Choose the next step
								</h3>
							</div>
						</div>
						<div className="mt-5 grid gap-3">
							{(Object.entries(STATUS_DETAILS) as Array<
								[PostStatus, (typeof STATUS_DETAILS)[PostStatus]]
							>).map(([nextStatus, details]) => (
								<button
									key={nextStatus}
									type="button"
									onClick={() => void submitPost(nextStatus)}
									disabled={isSubmitting || isThumbnailUploading}
									className={`rounded-[22px] border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
										status === nextStatus
											? "border-purpleContrast/40 bg-purpleContrast/16"
											: "border-zinc-700/50 bg-darkBg/45 hover:border-zinc-500/60"
									}`}
								>
									<p className="text-sm font-semibold text-zinc-100">
										{isSubmitting && status === nextStatus
											? "Saving..."
											: details.label}
									</p>
									<p className="mt-1 text-sm leading-6 text-zinc-400">
										{details.description}
									</p>
								</button>
							))}
						</div>

						{mode === "create" ? (
							<button
								type="button"
								onClick={() => {
									reset();
									setSlugTouched(false);
									setThumbnailMessage("");
									setSubmitState({ tone: null, message: "" });
								}}
								className="mt-4 w-full rounded-full border border-zinc-700/60 bg-darkBg/55 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500/70 hover:text-wheat"
							>
								Clear form
							</button>
						) : null}
					</section>
				</aside>
			</div>
		</form>
	);
}
