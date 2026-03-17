"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
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
import { useI18n } from "@/components/LocaleProvider";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import {
	getReadingTimeMinutes,
	slugifyPostValue,
	stripMarkdown,
} from "@/lib/post-shared";
import {
	buildPostSchema,
	MAX_POST_CONTENT,
	MAX_POST_DESCRIPTION,
	MAX_POST_SLUG,
	MAX_POST_THUMBNAIL_ALT,
	MAX_POST_TITLE,
} from "@/lib/validation/content";
import CircleProgress from "./CircleProgress";
import MainTagInput from "./MainTagInput";
import MarkdownEditor from "./MarkdownEditor";
import TagsInput from "./TagsInput";

type PostFormData = z.input<ReturnType<typeof buildPostSchema>>;
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

export default function Form({
	mainTagsOptions,
	mode = "create",
	initialValues,
	existingSlug,
}: FormProps) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	const schema = useMemo(
		() => buildPostSchema(messages.postValidation),
		[messages],
	);
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
		resolver: zodResolver(schema),
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
	const statusDetails: Record<
		PostStatus,
		{ label: string; description: string }
	> = {
		draft: {
			label: messages.newPost.statusDraftLabel,
			description: messages.newPost.statusDraftDescription,
		},
		pending_review: {
			label: messages.newPost.statusPendingReviewLabel,
			description: messages.newPost.statusPendingReviewDescription,
		},
		published: {
			label: messages.newPost.statusPublishedLabel,
			description: messages.newPost.statusPublishedDescription,
		},
	};

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
					? translatePostFieldError(data.error, messages)
					: messages.newPost.imageUploadError;
			throw new Error(message);
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
			setThumbnailMessage(messages.newPost.thumbnailUploaded);
		} catch (error) {
			setError("thumbnail", {
				type: "manual",
				message:
					error instanceof Error
						? translatePostFieldError(error.message, messages)
						: messages.newPost.thumbnailUploadError,
			});
			setThumbnailMessage("");
		} finally {
			setIsThumbnailUploading(false);
			event.target.value = "";
		}
	}

	function applyServerFieldErrors(
		fields:
			| Partial<Record<keyof PostFormData, string[] | undefined>>
			| undefined,
	) {
		if (!fields) {
			return;
		}

		for (const [fieldName, fieldMessages] of Object.entries(fields)) {
			if (!fieldMessages?.length) {
				continue;
			}

			setError(fieldName as FieldPath<PostFormData>, {
				type: "server",
				message: translatePostFieldError(fieldMessages[0], messages),
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

			const result = (await response.json().catch(() => null)) as {
				error?: string;
				fields?: Partial<Record<keyof PostFormData, string[] | undefined>>;
				slug?: string;
			} | null;

			if (!response.ok) {
				applyServerFieldErrors(result?.fields);
				setSubmitState({
					tone: "error",
					message: translatePostFieldError(
						result?.error || messages.newPost.submitError,
						messages,
					),
				});
				return;
			}

			setSubmitState({
				tone: "success",
				message:
					nextStatus === "published"
						? messages.newPost.submitSuccessPublished
						: nextStatus === "pending_review"
							? messages.newPost.submitSuccessReview
							: messages.newPost.submitSuccessDraft,
			});

			if (result?.slug) {
				push(`/post/${result.slug}`);
			}
		})();
	}

	const checklist = [
		{
			label: messages.newPost.checklistTitleSet,
			done: title.trim().length >= 3,
		},
		{
			label: messages.newPost.checklistThumbnailUploaded,
			done: Boolean(thumbnail),
		},
		{
			label: messages.newPost.checklistMainTagChosen,
			done: Boolean(mainTag.trim()),
		},
		{
			label: messages.newPost.checklistSupportingTagsAdded,
			done: tags.length > 0,
		},
		{
			label: messages.newPost.checklistDescriptionReady,
			done: description.trim().length >= 20,
		},
		{
			label: messages.newPost.checklistBodyHasSubstance,
			done: content.trim().length >= 120,
		},
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
											{mode === "edit"
												? messages.newPost.editorEyebrowEdit
												: messages.newPost.editorEyebrowCreate}
										</p>
										<h2 className="mt-2 text-3xl font-somerton text-wheat">
											{mode === "edit"
												? messages.newPost.editorTitleEdit
												: messages.newPost.editorTitleCreate}
										</h2>
									</div>
								</div>
								<p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
									{messages.newPost.editorDescription}
								</p>
							</div>

							<div className="rounded-[24px] border border-zinc-700/60 bg-darkBg/45 px-4 py-3 text-right">
								<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
									{messages.newPost.mode}
								</p>
								<p className="mt-1 text-lg font-semibold text-zinc-100">
									{mode === "edit"
										? messages.newPost.modeEditing
										: messages.newPost.modeCreating}
								</p>
								<p className="mt-1 text-sm text-zinc-500">
									{initialValues?.authorName || messages.newPost.defaultAuthor}
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
									{messages.newPost.storySetupEyebrow}
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.storySetupTitle}
								</h3>
							</div>
						</div>
						<div className="grid gap-5">
							<label className="block">
								<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									<FaPenNib className="text-xs text-zinc-500" />
									<span>{messages.newPost.title}</span>
								</div>
								<input
									type="text"
									{...register("title")}
									maxLength={MAX_POST_TITLE}
									className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder={messages.newPost.titlePlaceholder}
								/>
								<div className="mt-2 flex items-center justify-between">
									<p className="text-sm text-red-400">
										{errors.title?.message}
									</p>
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
										<span>{messages.newPost.slug}</span>
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
										{messages.newPost.regenerate}
									</button>
								</div>
								<input
									type="text"
									{...register("slug", {
										onChange: () => setSlugTouched(true),
									})}
									maxLength={MAX_POST_SLUG}
									className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder={messages.newPost.slugPlaceholder}
								/>
								<p className="mt-2 text-sm text-zinc-500">
									{messages.newPost.finalUrl(
										slug || messages.newPost.slugPlaceholder,
									)}
								</p>
								<p className="mt-1 text-sm text-red-400">
									{errors.slug?.message}
								</p>
							</label>

							<label className="block">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										<FaFileLines className="text-xs text-zinc-500" />
										<span>{messages.newPost.description}</span>
									</div>
									<button
										type="button"
										onClick={() => {
											const generated = stripMarkdown(content).slice(0, 220);
											setValue("description", generated, {
												shouldValidate: true,
											});
										}}
										className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-wheat"
									>
										<FaArrowsRotate className="text-xs" />
										{messages.newPost.generateFromContent}
									</button>
								</div>
								<textarea
									{...register("description")}
									maxLength={MAX_POST_DESCRIPTION}
									rows={3}
									className="mt-2 w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/55 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder={messages.newPost.descriptionPlaceholder}
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
									{messages.newPost.visualsEyebrow}
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.visualsTitle}
								</h3>
							</div>
						</div>
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
							<div>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0">
										<p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
											<FaImage className="text-xs text-zinc-500" />
											<span>{messages.newPost.thumbnail}</span>
										</p>
										<p className="mt-2 text-sm leading-6 text-zinc-500">
											{messages.newPost.thumbnailDescription}
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
										{isThumbnailUploading
											? messages.newPost.uploading
											: messages.newPost.upload}
									</label>
								</div>

								<input type="hidden" {...register("thumbnail")} />
								{thumbnail ? (
									<div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-700/50 bg-darkBg/45">
										<img
											src={thumbnail}
											alt={thumbnailAlt || messages.newPost.thumbnailPreviewAlt}
											className="aspect-[16/10] w-full object-cover"
										/>
									</div>
								) : (
									<div className="mt-4 flex aspect-[16/10] items-center justify-center rounded-[24px] border border-dashed border-zinc-700/60 bg-darkBg/30 text-center text-zinc-500">
										{messages.newPost.thumbnailEmpty}
									</div>
								)}
								<p className="mt-3 text-sm text-red-400">
									{errors.thumbnail?.message}
								</p>
								{thumbnailMessage ? (
									<p className="mt-1 text-sm text-emerald-400">
										{thumbnailMessage}
									</p>
								) : null}
							</div>

							<label className="block">
								<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									<FaLink className="text-xs text-zinc-500" />
									<span>{messages.newPost.thumbnailAlt}</span>
								</div>
								<textarea
									{...register("thumbnailAlt")}
									maxLength={MAX_POST_THUMBNAIL_ALT}
									rows={5}
									className="mt-2 w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/55 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
									placeholder={messages.newPost.thumbnailAltPlaceholder}
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
											{messages.newPost.bodyEyebrow}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-zinc-100">
											{messages.newPost.bodyTitle}
										</h3>
									</div>
								</div>
								<p className="mt-2 text-sm leading-6 text-zinc-500">
									{messages.newPost.bodyDescription}
								</p>
							</div>
							<div className="rounded-[22px] border border-zinc-700/60 bg-darkBg/45 px-4 py-3 text-right sm:shrink-0">
								<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
									<FaClock className="mr-2 inline text-xs" />
									{messages.newPost.readTime}
								</p>
								<p className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.editorReadTime(readingTime)}
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
									{messages.newPost.taxonomyEyebrow}
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.taxonomyTitle}
								</h3>
							</div>
						</div>

						<div className="mt-5 grid gap-5">
							<div>
								<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									{messages.newPost.mainTag}
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
									{messages.newPost.tags}
								</span>
								<Controller
									control={control}
									name="tags"
									render={({ field }) => (
										<div className="mt-2">
											<TagsInput
												value={field.value || []}
												onChange={field.onChange}
											/>
										</div>
									)}
								/>
								<p className="mt-2 text-sm text-red-400">
									{errors.tags?.message}
								</p>
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
									{messages.newPost.readinessEyebrow}
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.readinessTitle}
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
										className={item.done ? "text-emerald-400" : "text-zinc-500"}
									>
										{item.done
											? messages.newPost.ready
											: messages.newPost.missing}
									</span>
								</div>
							))}
						</div>

						<div className="mt-5 rounded-[22px] border border-zinc-700/50 bg-darkBg/45 p-4 text-sm text-zinc-400">
							<p>{messages.newPost.wordCount(wordCount)}</p>
							<p className="mt-2">{messages.newPost.tagCount(tags.length)}</p>
							<p className="mt-2 capitalize">
								{messages.newPost.currentTarget(statusDetails[status].label)}
							</p>
						</div>
					</section>

					<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10">
						<div className="flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
								<FaPaperPlane />
							</div>
							<div>
								<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
									{messages.newPost.publishEyebrow}
								</p>
								<h3 className="mt-1 text-lg font-semibold text-zinc-100">
									{messages.newPost.publishTitle}
								</h3>
							</div>
						</div>
						<div className="mt-5 grid gap-3">
							{(
								Object.entries(statusDetails) as Array<
									[PostStatus, (typeof statusDetails)[PostStatus]]
								>
							).map(([nextStatus, details]) => (
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
											? messages.newPost.saving
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
								{messages.newPost.clearForm}
							</button>
						) : null}
					</section>
				</aside>
			</div>
		</form>
	);
}

function translatePostFieldError(
	message: string,
	messages: ReturnType<typeof useI18n>["messages"],
) {
	switch (message) {
		case "Image is required.":
			return messages.postValidation.imageRequired;
		case "Image must be an uploaded file path or a valid URL.":
			return messages.postValidation.imageInvalid;
		case "Tags cannot be empty.":
			return messages.postValidation.tagEmpty;
		case "Title must be at least 3 characters.":
			return messages.postValidation.titleMin;
		case "Slug can only contain lowercase letters, numbers, and hyphens.":
			return messages.postValidation.slugInvalid;
		case "Content must be at least 30 characters.":
			return messages.postValidation.contentMin;
		case "Main tag is required.":
			return messages.postValidation.mainTagRequired;
		case "At least one tag is required.":
			return messages.postValidation.tagsRequired;
		case "Tags must be unique.":
			return messages.postValidation.tagsUnique;
		case "Please correct the post fields.":
		case "Unable to save the post right now. Please try again.":
		case "Unable to create post right now.":
		case "Unable to update post right now.":
			return messages.newPost.submitError;
		case "Unable to upload thumbnail.":
			return messages.newPost.thumbnailUploadError;
		case "Unable to upload image.":
		case "Unable to upload image right now.":
		case "Image file is required.":
		case "Only JPG, PNG, WEBP, and GIF files are supported.":
		case "Images must be 4MB or smaller.":
		case "Unauthorized":
		case "You do not have permission to upload images.":
			return messages.newPost.imageUploadError;
		default: {
			const titleMax = message.match(
				/^Title must be (\d+) characters or fewer\.$/,
			);
			if (titleMax) {
				return messages.postValidation.titleMax(Number(titleMax[1]));
			}

			const slugMax = message.match(
				/^Slug must be (\d+) characters or fewer\.$/,
			);
			if (slugMax) {
				return messages.postValidation.slugMax(Number(slugMax[1]));
			}

			const contentMax = message.match(
				/^Content must be (\d+) characters or fewer\.$/,
			);
			if (contentMax) {
				return messages.postValidation.contentMax(Number(contentMax[1]));
			}

			const tagMax = message.match(
				/^Tags must be (\d+) characters or fewer\.$/,
			);
			if (tagMax) {
				return messages.postValidation.tagMaxLength(Number(tagMax[1]));
			}

			const thumbAltMax = message.match(
				/^Thumbnail alt text must be (\d+) characters or fewer\.$/,
			);
			if (thumbAltMax) {
				return messages.postValidation.thumbnailAltMax(Number(thumbAltMax[1]));
			}

			const tagsMaxItems = message.match(
				/^Tags must contain (\d+) items or fewer\.$/,
			);
			if (tagsMaxItems) {
				return messages.postValidation.tagsMaxItems(Number(tagsMaxItems[1]));
			}

			const descriptionMax = message.match(
				/^Description must be (\d+) characters or fewer\.$/,
			);
			if (descriptionMax) {
				return messages.postValidation.descriptionMax(
					Number(descriptionMax[1]),
				);
			}

			return message;
		}
	}
}
