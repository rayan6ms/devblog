import { useEffect, useRef, useState } from "react";

interface InfiniteScrollerProps {
	tags: string[];
	direction: "left" | "right";
	onSelectTag?: (tag: string) => void;
}

export default function InfiniteScroller({
	tags,
	direction,
	onSelectTag,
}: InfiniteScrollerProps) {
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const [isHovering, setIsHovering] = useState(false);

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;

		const handleMouseEnter = () => setIsHovering(true);
		const handleMouseLeave = () => setIsHovering(false);

		scroller.addEventListener("mouseenter", handleMouseEnter);
		scroller.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			scroller.removeEventListener("mouseenter", handleMouseEnter);
			scroller.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, []);

	useEffect(() => {
		let animationFrameId: number;

		const scrollInfinite = () => {
			if (scrollerRef.current && !isHovering) {
				const scroller = scrollerRef.current;
				if (direction === "right") {
					scroller.scrollLeft -= 1;
					if (scroller.scrollLeft <= 0) {
						scroller.scrollLeft = scroller.scrollWidth / 2;
					}
				} else {
					scroller.scrollLeft += 1;
					if (
						scroller.scrollLeft + scroller.clientWidth >=
						scroller.scrollWidth
					) {
						scroller.scrollLeft =
							scroller.scrollWidth / 2 - scroller.clientWidth;
					}
				}
			}

			animationFrameId = requestAnimationFrame(scrollInfinite);
		};

		animationFrameId = requestAnimationFrame(scrollInfinite);

		return () => cancelAnimationFrame(animationFrameId);
	}, [direction, isHovering]);

	return (
		<div
			ref={scrollerRef}
			className="overflow-x-hidden whitespace-nowrap shadow-inner shadow-darkBg rounded-2xl"
		>
			{tags.map((tag) => (
				<button
					key={`${tag}-primary`}
					type="button"
					className="cursor-pointer inline-block px-4 uppercase hover:text-purpleContrast text-[13px] tracking-[.06em] leading-5 w-fit p-1 m-2 font-sans bg-gray-800 rounded-lg text-zinc-400 hover:bg-gray-700"
					onClick={() => onSelectTag?.(tag)}
				>
					{tag}
				</button>
			))}
			{tags.map((tag) => (
				<button
					key={`${tag}-duplicate`}
					type="button"
					className="cursor-pointer inline-block px-4 uppercase hover:text-purpleContrast text-[13px] tracking-[.06em] leading-5 w-fit p-1 m-2 font-sans bg-gray-800 rounded-lg text-zinc-400 hover:bg-gray-700"
					onClick={() => onSelectTag?.(tag)}
				>
					{tag}
				</button>
			))}
		</div>
	);
}
