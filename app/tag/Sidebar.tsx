import { FaMagnifyingGlass } from "react-icons/fa6";

export interface TagOption {
	count: number;
	name: string;
	slug: string;
}

interface SidebarProps {
	tagQuery: string;
	selectedTags: string[];
	featuredTags: TagOption[];
	mainTags: TagOption[];
	otherTags: TagOption[];
	maxSelectedTags: number;
	onSelectTag: (tag: string) => void;
	onReset: () => void;
	onTagQueryChange: (value: string) => void;
}

interface TagGroupProps {
	title: string;
	description: string;
	tags: TagOption[];
	selectedTags: string[];
	onSelectTag: (tag: string) => void;
}

function TagGroup({
	title,
	description,
	tags,
	selectedTags,
	onSelectTag,
}: TagGroupProps) {
	return (
		<section>
			<div className="mb-3">
				<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">
					{title}
				</h3>
				<p className="mt-1 text-sm text-zinc-500">{description}</p>
			</div>
			{tags.length > 0 ? (
				<div className="max-h-64 space-y-2 overflow-y-auto pr-1">
					{tags.map((tag) => {
						const isSelected = selectedTags.includes(tag.slug);

						return (
							<button
								key={tag.slug}
								type="button"
								className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
									isSelected
										? "border-purpleContrast/50 bg-purpleContrast/15 text-wheat"
										: "border-zinc-700/50 bg-greyBg/80 text-zinc-300 hover:border-zinc-500/80 hover:text-wheat"
								}`}
								onClick={() => onSelectTag(tag.name)}
							>
								<span className="truncate text-sm font-medium">
									{tag.name}
								</span>
								<span className="ml-3 rounded-full bg-darkBg px-2 py-1 text-xs text-zinc-500">
									{tag.count}
								</span>
							</button>
						);
					})}
				</div>
			) : (
				<p className="rounded-xl border border-dashed border-zinc-700/60 bg-greyBg/60 px-3 py-4 text-sm text-zinc-500">
					No tags match the current search.
				</p>
			)}
		</section>
	);
}

export default function Sidebar({
	tagQuery,
	selectedTags,
	featuredTags,
	mainTags,
	otherTags,
	maxSelectedTags,
	onSelectTag,
	onReset,
	onTagQueryChange,
}: SidebarProps) {
	return (
		<aside className="self-start rounded-[26px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20 xl:sticky xl:top-24">
			<div className="border-b border-zinc-700/50 p-5">
				<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
					Filter Posts
				</p>
				<h2 className="mt-2 text-3xl font-somerton uppercase text-wheat">
					Find a topic
				</h2>
				<p className="mt-2 text-sm leading-6 text-zinc-400">
					Search tags, combine up to {maxSelectedTags}, and narrow the post grid
					without leaving the page.
				</p>
				<label className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-700/60 bg-greyBg/75 px-4 py-3 text-zinc-400 focus-within:border-zinc-500 focus-within:text-zinc-300">
					<FaMagnifyingGlass className="shrink-0 text-sm" />
					<input
						type="text"
						value={tagQuery}
						onChange={(event) => onTagQueryChange(event.target.value)}
						placeholder="Search tags"
						className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
					/>
				</label>
			</div>

			<div className="space-y-6 p-5">
				<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 p-4">
					<div className="flex items-center justify-between text-sm text-zinc-400">
						<span>Selected tags</span>
						<span>
							{selectedTags.length}/{maxSelectedTags}
						</span>
					</div>
					<p className="mt-2 text-sm text-zinc-500">
						{selectedTags.length > 0
							? "Add another tag to refine further, or reset to broaden the results."
							: "Start with a broad topic, then layer supporting tags if you need to focus the results."}
					</p>
					{selectedTags.length > 0 && (
						<button
							type="button"
							className="mt-4 inline-flex items-center rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300 transition-colors hover:border-zinc-400 hover:text-wheat"
							onClick={onReset}
						>
							Clear filters
						</button>
					)}
				</div>

				{featuredTags.length > 0 && (
					<section>
						<div className="mb-3">
							<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">
								Quick picks
							</h3>
							<p className="mt-1 text-sm text-zinc-500">
								Popular tags that open the page up fast.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{featuredTags.map((tag) => {
								const isSelected = selectedTags.includes(tag.slug);

								return (
									<button
										key={tag.slug}
										type="button"
										className={`rounded-full border px-3 py-2 text-sm transition-colors ${
											isSelected
												? "border-purpleContrast/50 bg-purpleContrast/15 text-wheat"
												: "border-zinc-700/60 bg-greyBg text-zinc-300 hover:border-zinc-500 hover:text-wheat"
										}`}
										onClick={() => onSelectTag(tag.name)}
									>
										{tag.name}
									</button>
								);
							})}
						</div>
					</section>
				)}

				<TagGroup
					title="Main topics"
					description="Primary categories that define the post."
					tags={mainTags}
					selectedTags={selectedTags}
					onSelectTag={onSelectTag}
				/>

				<TagGroup
					title="Supporting tags"
					description="Secondary details and related subjects."
					tags={otherTags}
					selectedTags={selectedTags}
					onSelectTag={onSelectTag}
				/>
			</div>
		</aside>
	);
}
