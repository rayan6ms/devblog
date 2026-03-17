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
	const hasTags = tags.length > 0;
	const title = hasTags
		? `${resultsCount} ${resultsCount === 1 ? "post" : "posts"} matching ${tags.length} ${tags.length === 1 ? "tag" : "tags"}`
		: `Showing all ${resultsCount} ${resultsCount === 1 ? "post" : "posts"}`;

	return (
		<section className="rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 p-5 shadow-xl shadow-zinc-950/20">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
						Results
					</p>
					<h2 className="mt-2 text-2xl font-semibold text-wheat">{title}</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
						{hasTags
							? "Remove a tag to broaden the results or keep combining related topics to stay focused."
							: "Use the quick picks, marquee rows, or the filter panel to drill into a specific theme."}
					</p>
				</div>
				{hasTags && (
					<button
						type="button"
						className="inline-flex items-center rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-wheat"
						onClick={onReset}
					>
						Reset all
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
								aria-label={`Remove ${tag.label}`}
							>
								✕
							</button>
						</span>
					))
				) : (
					<p className="rounded-2xl border border-dashed border-zinc-700/60 bg-greyBg/60 px-4 py-3 text-sm text-zinc-500">
						No active tag filters.
					</p>
				)}
			</div>
		</section>
	);
}
