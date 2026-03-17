import { useI18n } from "@/components/LocaleProvider";

interface SelectedTag {
	label: string;
	slug: string;
}

interface SelectedTagsProps {
	tags: SelectedTag[];
	resultsCount: number;
	onRemoveTag: (tag: string) => void;
	onReset: () => void;
}

export default function SelectedTags({
	tags,
	resultsCount,
	onRemoveTag,
	onReset,
}: SelectedTagsProps) {
	const { messages } = useI18n();
	const hasTags = tags.length > 0;
	const title = hasTags
		? messages.tag.resultsSummary(resultsCount, tags.length)
		: messages.tag.showingAll(resultsCount);

	return (
		<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
						{messages.common.results}
					</p>
					<h2 className="mt-2 text-2xl font-semibold text-wheat">{title}</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
						{hasTags
							? messages.tag.resultsDescription
							: messages.tag.resultsDescriptionEmpty}
					</p>
				</div>
				{hasTags && (
					<button
						type="button"
						className="inline-flex items-center rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-wheat"
						onClick={onReset}
					>
						{messages.tag.resetAll}
					</button>
				)}
			</div>

			<div className="mt-5 flex flex-wrap gap-2">
				{hasTags ? (
					tags.map((tag) => (
						<span
							key={tag.slug}
							className="capitalize inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg px-3 py-2 text-sm text-zinc-200"
						>
							{tag.label}
							<button
								type="button"
								className="rounded-full bg-darkBg px-1.5 py-0.5 text-xs text-zinc-400 transition-colors hover:text-wheat"
								onClick={() => onRemoveTag(tag.slug)}
								aria-label={messages.tag.removeTag(tag.label)}
							>
								✕
							</button>
						</span>
					))
				) : (
					<p className="rounded-2xl border border-dashed border-zinc-700/60 bg-greyBg/60 px-4 py-3 text-sm text-zinc-500">
						{messages.tag.noActiveFilters}
					</p>
				)}
			</div>
		</section>
	);
}
