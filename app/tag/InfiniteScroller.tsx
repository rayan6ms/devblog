import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import slugify from "slugify";

interface InfiniteScrollerProps {
	tags: string[];
	direction: "left" | "right";
	label: string;
	description: string;
	selectedTags?: string[];
	onSelectTag?: (tag: string) => void;
}

export default function InfiniteScroller({
	tags,
	direction,
	label,
	description,
	selectedTags = [],
	onSelectTag,
}: InfiniteScrollerProps) {
	const [isPaused, setIsPaused] = useState(false);
	const marqueeStyle = useMemo(
		() =>
			({
				"--marquee-duration": `${Math.max(tags.length * 4, 24)}s`,
				animationDirection: direction === "left" ? "normal" : "reverse",
				animationPlayState: isPaused ? "paused" : "running",
			}) as CSSProperties,
		[direction, isPaused, tags.length],
	);

	if (tags.length === 0) {
		return null;
	}

	const renderTags = (suffix: string, hidden = false) => (
		<div
			className="flex shrink-0 items-center gap-3 pr-3"
			aria-hidden={hidden || undefined}
		>
			{tags.map((tag) => {
				const isSelected = selectedTags.includes(
					slugify(tag, { lower: true, strict: true }),
				);

				return (
					<button
						key={`${tag}-${suffix}`}
						type="button"
						className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium tracking-[0.12em] uppercase transition-colors ${
							isSelected
								? "border-purpleContrast/60 bg-purpleContrast/20 text-wheat"
								: "border-zinc-700/60 bg-greyBg text-zinc-300 hover:border-zinc-500 hover:text-wheat"
						}`}
						onClick={() => onSelectTag?.(tag)}
					>
						{tag}
					</button>
				);
			})}
		</div>
	);

	return (
		<div className="rounded-2xl border border-zinc-700/40 bg-lessDarkBg/70 p-3 shadow-md shadow-zinc-950/20">
			<div className="mb-3 px-2">
				<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
					{label}
				</p>
				<p className="mt-1 text-sm text-zinc-400">{description}</p>
			</div>
			<div
				className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
				onMouseEnter={() => setIsPaused(true)}
				onMouseLeave={() => setIsPaused(false)}
				onFocusCapture={() => setIsPaused(true)}
				onBlurCapture={() => setIsPaused(false)}
			>
				<div className="animate-tag-marquee flex w-max" style={marqueeStyle}>
					{renderTags("primary")}
					{renderTags("duplicate", true)}
				</div>
			</div>
		</div>
	);
}
