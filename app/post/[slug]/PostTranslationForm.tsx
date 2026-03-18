"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, type FieldPath, useForm } from "react-hook-form";
import { FaFileLines, FaGlobe, FaLanguage } from "react-icons/fa6";
import type { z } from "zod";
import { useI18n } from "@/components/LocaleProvider";
import { getLocaleLabel, localeOptions, type Locale } from "@/lib/i18n";
import {
	buildPostTranslationSchema,
	MAX_POST_CONTENT,
	MAX_POST_DESCRIPTION,
	MAX_POST_THUMBNAIL_ALT,
	MAX_POST_TITLE,
} from "@/lib/validation/content";
import MarkdownEditor from "@/new_post/MarkdownEditor";

type TranslationFormData = z.input<ReturnType<typeof buildPostTranslationSchema>>;

type TranslationRecord = {
	locale: Locale;
	title: string;
	content: string;
	description: string;
	thumbnailAlt: string;
	updatedAt: string;
};

type Props = {
	postSlug: string;
	originalLocale: Locale;
	originalPost: {
		title: string;
		content: string;
		description: string;
		thumbnailAlt: string;
	};
	translations: TranslationRecord[];
};

type SubmitState = {
	tone: "error" | "success" | null;
	message: string;
};

type UploadResponse = {
	url: string;
	name: string;
	size: number;
};

function getLocaleOptions(originalLocale: Locale) {
	return localeOptions.filter((option) => option.value !== originalLocale);
}

export default function PostTranslationForm({
	postSlug,
	originalLocale,
	originalPost,
	translations,
}: Props) {
	const { messages } = useI18n();
	const schema = useMemo(
		() => buildPostTranslationSchema(messages.postValidation),
		[messages],
	);
	const availableLocales = useMemo(
		() => getLocaleOptions(originalLocale),
		[originalLocale],
	);
	const [localTranslations, setLocalTranslations] =
		useState<TranslationRecord[]>(translations);
	const initialLocale = (translations[0]?.locale ||
		availableLocales[0]?.value ||
		"en") as Locale;
	const [selectedLocale, setSelectedLocale] = useState<Locale>(initialLocale);
	const [submitState, setSubmitState] = useState<SubmitState>({
		tone: null,
		message: "",
	});

	const {
		control,
		handleSubmit,
		register,
		reset,
		setError,
		clearErrors,
		formState: { errors, isSubmitting },
	} = useForm<TranslationFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			description: "",
			thumbnailAlt: "",
			content: "",
		},
	});

	const translationsByLocale = useMemo(
		() =>
			new Map(
				localTranslations.map((translation) => [translation.locale, translation]),
			),
		[localTranslations],
	);
	const activeTranslation = translationsByLocale.get(selectedLocale);

	useEffect(() => {
		reset({
			title: activeTranslation?.title || "",
			description: activeTranslation?.description || "",
			thumbnailAlt: activeTranslation?.thumbnailAlt || "",
			content: activeTranslation?.content || "",
		});
		clearErrors();
	}, [activeTranslation, clearErrors, reset, selectedLocale]);

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
			throw new Error(
				data && "error" in data && typeof data.error === "string"
					? data.error
					: messages.newPost.imageUploadError,
			);
		}

		return data;
	}

	function applyServerFieldErrors(
		fields:
			| Partial<Record<keyof TranslationFormData | "locale", string[] | undefined>>
			| undefined,
	) {
		if (!fields) {
			return;
		}

		for (const [fieldName, fieldMessages] of Object.entries(fields)) {
			if (!fieldMessages?.length) {
				continue;
			}

			if (fieldName === "locale") {
				setSubmitState({
					tone: "error",
					message: translateTranslationFieldError(fieldMessages[0], messages),
				});
				continue;
			}

			setError(fieldName as FieldPath<TranslationFormData>, {
				type: "server",
				message: translateTranslationFieldError(fieldMessages[0], messages),
			});
		}
	}

	function fillFromOriginal() {
		reset({
			title: originalPost.title,
			description: originalPost.description,
			thumbnailAlt: originalPost.thumbnailAlt,
			content: originalPost.content,
		});
		clearErrors();
		setSubmitState({
			tone: "success",
			message: messages.newPost.translationCopiedFromOriginal,
		});
	}

	async function saveTranslation() {
		await handleSubmit(async (data) => {
			setSubmitState({ tone: null, message: "" });
			clearErrors();

			const response = await fetch(`/api/post/${postSlug}/translations`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					locale: selectedLocale,
					...data,
				}),
			});

			const result = (await response.json().catch(() => null)) as
				| {
						error?: string;
						fields?: Partial<
							Record<keyof TranslationFormData | "locale", string[] | undefined>
						>;
					}
				| null;

			if (!response.ok) {
				applyServerFieldErrors(result?.fields);
				setSubmitState({
					tone: "error",
					message: translateTranslationFieldError(
						result?.error || messages.newPost.translationSaveError,
						messages,
					),
				});
				return;
			}

			setSubmitState({
				tone: "success",
				message: messages.newPost.translationSaveSuccess,
			});
			setLocalTranslations((current) => {
				const next = current.filter(
					(translation) => translation.locale !== selectedLocale,
				);

				return [
					...next,
					{
						locale: selectedLocale,
						title: data.title.trim(),
						description: data.description?.trim() || "",
						thumbnailAlt: data.thumbnailAlt?.trim() || "",
						content: data.content.trim(),
						updatedAt: new Date().toISOString(),
					},
				].sort((left, right) => left.locale.localeCompare(right.locale));
			});
		})();
	}

	return (
		<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/80 p-6 shadow-lg shadow-zinc-950/10 sm:p-7">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700/60 bg-darkBg/45 text-wheat">
							<FaLanguage />
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
								{messages.newPost.translationEyebrow}
							</p>
							<h3 className="mt-1 text-lg font-semibold text-zinc-100">
								{messages.newPost.translationTitle}
							</h3>
						</div>
					</div>
					<p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
						{messages.newPost.translationDescription}
					</p>
				</div>

				<div className="rounded-[22px] border border-zinc-700/60 bg-darkBg/45 px-4 py-3 text-right">
					<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
						{messages.newPost.language}
					</p>
					<p className="mt-1 text-lg font-semibold text-zinc-100">
						{getLocaleLabel(originalLocale)}
					</p>
					<p className="mt-1 text-sm text-zinc-500">
						{messages.newPost.translationOriginalLanguage}
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

			{availableLocales.length === 0 ? (
				<p className="mt-5 text-sm text-zinc-400">
					{messages.newPost.translationNoLocales}
				</p>
			) : (
				<div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
					<aside className="grid gap-5">
						<div className="rounded-[24px] border border-zinc-700/50 bg-darkBg/45 p-4">
							<label className="block">
								<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
									{messages.newPost.translationLanguage}
								</span>
								<select
									value={selectedLocale}
									onChange={(event) =>
										setSelectedLocale(event.target.value as Locale)
									}
									className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors focus:border-purpleContrast/45"
								>
									{availableLocales.map((option) => (
										<option
											key={option.value}
											value={option.value}
											className="bg-greyBg text-zinc-100"
										>
											{option.label}
										</option>
									))}
								</select>
								<p className="mt-2 text-sm text-zinc-500">
									{messages.newPost.translationLanguageHelp}
								</p>
							</label>
						</div>

						<div className="rounded-[24px] border border-zinc-700/50 bg-darkBg/45 p-4">
							<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
								<FaGlobe className="text-xs text-zinc-500" />
								<span>{messages.newPost.translationExisting}</span>
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{localTranslations.length > 0 ? (
									localTranslations.map((translation) => (
										<button
											key={translation.locale}
											type="button"
											onClick={() => setSelectedLocale(translation.locale)}
											className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
												selectedLocale === translation.locale
													? "border-purpleContrast/40 bg-purpleContrast/16 text-wheat"
													: "border-zinc-700/60 bg-greyBg/70 text-zinc-300 hover:border-zinc-500/70 hover:text-wheat"
											}`}
										>
											{getLocaleLabel(translation.locale)}
										</button>
									))
								) : (
									<p className="text-sm text-zinc-500">
										{messages.newPost.translationNoneYet}
									</p>
								)}
							</div>
						</div>
					</aside>

					<div className="grid gap-5">
						<div className="rounded-[24px] border border-zinc-700/50 bg-darkBg/45 p-5">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
										{activeTranslation
											? messages.newPost.translationStatusExisting
											: messages.newPost.translationStatusNew}
									</p>
									<h4 className="mt-2 text-lg font-semibold text-zinc-100">
										{getLocaleLabel(selectedLocale)}
									</h4>
								</div>

								<button
									type="button"
									onClick={fillFromOriginal}
									className="rounded-full border border-zinc-700/60 bg-greyBg/70 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500/70 hover:text-wheat"
								>
									{messages.newPost.translationCopyFromOriginal}
								</button>
							</div>

							<div className="mt-5 grid gap-5">
								<label className="block">
									<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										<FaFileLines className="text-xs text-zinc-500" />
										<span>{messages.newPost.title}</span>
									</div>
									<input
										type="text"
										{...register("title")}
										maxLength={MAX_POST_TITLE}
										className="mt-2 h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
										placeholder={messages.newPost.titlePlaceholder}
									/>
									<p className="mt-2 text-sm text-red-400">
										{errors.title?.message}
									</p>
								</label>

								<label className="block">
									<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										{messages.newPost.description}
									</span>
									<textarea
										{...register("description")}
										maxLength={MAX_POST_DESCRIPTION}
										rows={3}
										className="mt-2 w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/55 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
										placeholder={messages.newPost.descriptionPlaceholder}
									/>
									<p className="mt-2 text-sm text-red-400">
										{errors.description?.message}
									</p>
								</label>

								<label className="block">
									<span className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										{messages.newPost.thumbnailAlt}
									</span>
									<textarea
										{...register("thumbnailAlt")}
										maxLength={MAX_POST_THUMBNAIL_ALT}
										rows={3}
										className="mt-2 w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/55 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
										placeholder={messages.newPost.thumbnailAltPlaceholder}
									/>
									<p className="mt-2 text-sm text-red-400">
										{errors.thumbnailAlt?.message}
									</p>
								</label>

								<div>
									<div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-300">
										<FaFileLines className="text-xs text-zinc-500" />
										<span>{messages.newPost.bodyTitle}</span>
									</div>
									<p className="mt-2 text-sm leading-6 text-zinc-500">
										{messages.newPost.translationBodyDescription}
									</p>
									<div className="mt-4">
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
									</div>
									<p className="mt-2 text-sm text-red-400">
										{errors.content?.message}
									</p>
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={() => void saveTranslation()}
							disabled={isSubmitting}
							className="rounded-full border border-purpleContrast/40 bg-purpleContrast/16 px-5 py-3 text-sm font-semibold text-wheat transition-colors hover:bg-purpleContrast/24 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSubmitting
								? messages.newPost.translationSaving
								: messages.newPost.translationSave}
						</button>
					</div>
				</div>
			)}
		</section>
	);
}

function translateTranslationFieldError(
	message: string,
	messages: ReturnType<typeof useI18n>["messages"],
) {
	switch (message) {
		case "Post language is required.":
			return messages.postValidation.localeRequired;
		case "Please correct the translation fields.":
		case "Unable to save the translation right now.":
			return messages.newPost.translationSaveError;
		case "Translations must use a different language from the original post.":
			return messages.newPost.translationMustDiffer;
		default:
			return message;
	}
}
