"use client";

import { useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa6";
import type { IPost } from "@/data/posts";
import RecentItem from "./RecentItem";
import TrendingItem from "./TrendingItem";

interface SectionCardProps {
	posts: {
		recent: IPost[];
		recommended: IPost[];
	};
	section: {
		title: string;
		path: string;
	};
	index: number;
}

export default function SectionCard({
	posts,
	section,
	index,
}: SectionCardProps) {
	const router = useRouter();

	function handleRouteButtonClick(
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
		path: string,
	) {
		e.preventDefault();
		e.stopPropagation();
		router.push(path);
	}
	return (
		<div className="flex gap-3 flex-col items-center space-y-4 border border-gray-700 md:border-none lg:border rounded-md p-8">
			<h2 className="text-2xl font-bold text-center text-wheat">
				{section.title}
			</h2>
			<RecentItem post={posts.recent[index]} />
			{posts.recommended.slice(0, 2).map((post: IPost, index: number) => (
				<TrendingItem
					key={index}
					post={post}
					section
					addSeparation={index > 0}
				/>
			))}
			<button
				onClick={(e) => handleRouteButtonClick(e, section.path)}
				className="w-full flex items-center gap-2 hover:gap-0 self-start transition-all hover:text-purpleContrast group"
			>
				Mais destes
				<FaArrowRight className="transition-transform delay-200 ease-in-out transform group-hover:translate-x-4 group-hover:opacity-100" />
			</button>
		</div>
	);
}
