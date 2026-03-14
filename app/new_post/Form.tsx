"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import slugify from "slugify";
import { z } from "zod";
import CircleProgress from "./CircleProgress";
import MainTagInput from "./MainTagInput";
import MarkdownEditor from "./MarkdownEditor";
import TagsInput from "./TagsInput";

const MAX_TITLE = 100;
const MAX_CONTENT = 5000;
const MAX_TAGS = 5;

const postSchema = z.object({
	title: z
		.string()
		.min(3, "Title is required")
		.max(MAX_TITLE, `Max ${MAX_TITLE} characters`),
	content: z
		.string()
		.min(30, "Write at least a few lines")
		.max(MAX_CONTENT, `Max ${MAX_CONTENT} characters`),
	author: z.string().min(1, "Author ID is required"),
	mainTag: z.string().min(1, "Main tag is required"),
	tags: z
		.array(z.string())
		.min(1, "At least one tag is required")
		.max(MAX_TAGS, `Max ${MAX_TAGS} tags`),
	description: z.string().max(220, "Max 220 characters").optional(),
	status: z.enum(["draft", "pending_review", "published"]),
	images: z.array(z.string()).optional(),
});
type PostFormData = z.infer<typeof postSchema>;
type Mode = "create" | "edit";

export default function Form({
	mainTagsOptions,
	mode = "create",
	initialValues,
	existingSlug,
}: {
	mainTagsOptions: string[];
	mode?: Mode;
	initialValues?: Partial<PostFormData>;
	existingSlug?: string;
}) {
	const router = useRouter();

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		control,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<PostFormData>({
		resolver: zodResolver(postSchema),
		defaultValues: {
			title: initialValues?.title ?? "",
			content: initialValues?.content ?? "",
			description: initialValues?.description ?? "",
			tags: initialValues?.tags ?? [],
			mainTag: initialValues?.mainTag ?? "",
			author: initialValues?.author ?? "mock-user-id-1",
			status: initialValues?.status ?? "draft",
		},
	});

	const title = watch("title");
	const content = watch("content") || "";

	const handleTagsChange = (tags: string[]) => {
		setValue("tags", tags.slice(0, MAX_TAGS), { shouldValidate: true });
	};

	const handleMainTagSelect = (tag: string) => {
		setValue("mainTag", tag, { shouldValidate: true });
	};

	const onSubmit: SubmitHandler<PostFormData> = async (data) => {
		const plain = data.content
			.replace(/[#*_>`~\-![\]()]/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		const description = data.description?.trim().length
			? data.description.trim()
			: plain.slice(0, 180);

		const now = new Date().toISOString();
		const newSlug = slugify(data.title, { lower: true, strict: true });

		const post = {
			image: "",
			mainTag: data.mainTag,
			tags: data.tags,
			title: data.title,
			author: data.author,
			date: now,
			views: 0,
			hasStartedReading: false,
			percentRead: 0,
			description,
			content: data.content,
			status: data.status,
			slug: newSlug,
		};

		const existingRaw = localStorage.getItem("posts");
		const existing: Array<typeof post> = existingRaw
			? JSON.parse(existingRaw)
			: [];

		if (mode === "edit") {
			const idx = existing.findIndex((p) => p.slug === existingSlug);
			if (idx >= 0) {
				existing[idx] = { ...existing[idx], ...post };
			} else {
				existing.unshift(post);
			}
			localStorage.setItem("posts", JSON.stringify(existing));
			alert("Post updated (mock)!");
			router.push(`/post/${newSlug}`);
			return;
		}

		localStorage.setItem("posts", JSON.stringify([post, ...existing]));
		alert("Post saved (mock)!");
		router.push(`/post/${newSlug}`);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="w-full">
			<div className="mx-auto grid w-full max-w-4xl gap-6">
				<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/80 p-5 shadow-lg shadow-zinc-950/10 sm:p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
								Editor
							</p>
							<h2 className="mt-2 text-3xl font-somerton text-wheat">
								{mode === "edit" ? "Edit post" : "Create new post"}
							</h2>
							<p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
								Fill in the article metadata first, then shape the body in the
								markdown editor below.
							</p>
						</div>

						<label className="text-sm text-zinc-300">
							<span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">
								Status
							</span>
							<select
								className="h-11 rounded-full border border-zinc-600/60 bg-zinc-700/60 px-4 text-zinc-100 outline-none transition-colors focus:border-purpleContrast/45"
								{...register("status")}
							>
								<option value="draft">Draft</option>
								<option value="pending_review">Pending review</option>
								<option value="published">Published</option>
							</select>
						</label>
					</div>
				</div>

				<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/80 p-5 shadow-lg shadow-zinc-950/10 sm:p-6">
					<div className="grid gap-5">
						<label className="block">
							<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
								Title
							</span>
							<input
								type="text"
								{...register("title")}
								maxLength={MAX_TITLE}
								className="mt-2 block h-12 w-full rounded-2xl border border-zinc-600/45 bg-zinc-500/30 px-4 text-zinc-100 shadow-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
								placeholder="e.g. Understanding Promises in JavaScript"
							/>
							<div className="mt-2 flex items-center justify-between">
								<p className="text-sm text-red-500">{errors.title?.message}</p>
								<CircleProgress
									size={26}
									progress={
										(MAX_TITLE - Math.max(0, title?.length || 0)) / MAX_TITLE
									}
									remaining={MAX_TITLE - (title?.length || 0)}
								/>
							</div>
						</label>

						<div>
							<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
								Main tag
							</span>
							<div className="mt-2">
								<MainTagInput
									tags={mainTagsOptions}
									onTagSelect={handleMainTagSelect}
								/>
							</div>
							{errors.mainTag ? (
								<p className="mt-2 text-sm text-red-500">
									{errors.mainTag.message}
								</p>
							) : null}
						</div>

						<div>
							<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
								Tags
							</span>
							<div className="mt-2">
								<TagsInput onChange={handleTagsChange} maxTags={MAX_TAGS} />
							</div>
							{errors.tags ? (
								<p className="mt-2 text-sm text-red-500">{errors.tags.message}</p>
							) : null}
						</div>

						<label className="block">
							<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
								Short description
							</span>
							<input
								type="text"
								{...register("description")}
								maxLength={220}
								className="mt-2 block h-12 w-full rounded-2xl border border-zinc-600/45 bg-zinc-500/30 px-4 text-zinc-100 shadow-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
								placeholder="One-liner used in cards and meta…"
							/>
							<p className="mt-2 text-sm text-red-500">
								{errors.description?.message}
							</p>
						</label>
					</div>
				</div>

				<div className="rounded-[26px] border border-zinc-700/50 bg-greyBg/80 p-5 shadow-lg shadow-zinc-950/10 sm:p-6">
					<div className="mb-4">
						<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
							Content
						</span>
					</div>
					<Controller
						control={control}
						name="content"
						render={({ field }) => (
							<MarkdownEditor
								value={field.value || ""}
								onChange={(v) => field.onChange(v)}
								maxLength={MAX_CONTENT}
							/>
						)}
					/>
					<div className="mt-3 flex items-center justify-between">
						<p className="text-sm text-red-500">{errors.content?.message}</p>
						<CircleProgress
							size={26}
							progress={
								(MAX_CONTENT - Math.max(0, content.length)) / MAX_CONTENT
							}
							remaining={MAX_CONTENT - content.length}
						/>
					</div>
				</div>

				<div className="flex flex-wrap justify-end gap-3">
					{mode === "create" ? (
						<button
							type="button"
							className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600/50 bg-zinc-700/60 px-5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-700/80"
							onClick={() => reset()}
							disabled={isSubmitting}
						>
							Clear
						</button>
					) : null}
					<button
						type="submit"
						className="inline-flex h-11 items-center justify-center rounded-full border border-purpleContrast/35 bg-purpleContrast/20 px-5 text-sm font-semibold text-wheat transition-colors hover:bg-purpleContrast/28 disabled:opacity-50"
						disabled={isSubmitting}
					>
						{isSubmitting
							? mode === "edit"
								? "Updating…"
								: "Submitting…"
							: mode === "edit"
								? "Update"
								: "Submit"}
					</button>
				</div>
			</div>
		</form>
	);
}
