"use client";

import Image from "next/image";
import slugify from "slugify";
import LocalizedLink from "@/components/LocalizedLink";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getPostHref, type IPost } from "@/lib/posts-client";
import Popover from "./Popover";

type TrendingItemProps = {
	post: IPost;
	section?: boolean;
	addSeparation?: boolean;
};

export default function TrendingItem({
	post,
	section = false,
	addSeparation,
}: TrendingItemProps) {
	const { image, imageAlt, mainTag, title } = post;

	const tagId = slugify(mainTag, { lower: true, strict: true });
	const { push } = useLocaleNavigation();

	function handleRouteButtonClick(
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
		path: string,
	) {
		e.preventDefault();
		e.stopPropagation();
		push(path);
	}

	return (
		<LocalizedLink
			href={getPostHref(post)}
			className={`group flex gap-6 transition-colors duration-300
        ${
					section
						? "w-full max-w-none items-start border-r border-zinc-700/70 pr-4 hover:bg-[#1d2026]/70"
						: "w-full h-[130px] rounded-[18px] border border-zinc-700/50 bg-greyBg/70 pr-2 shadow-lg shadow-zinc-950/10 hover:bg-[#1d2026] sm:h-[180px] md:w-[320px] md:h-[120px] lg:w-[380px] lg:h-[150px] xxl:w-[300px] xxl:h-[100px]"
				}
        box-content ${addSeparation && "mt-5"}`}
		>
			<div
				className={`relative flex overflow-hidden ${
					section
						? "h-[96px] min-w-[96px] max-w-[96px] rounded-lg border border-zinc-700/50 sm:h-[108px] sm:min-w-[108px] sm:max-w-[108px]"
						: "h-full min-w-[130px] max-w-[130px] rounded-[18px] border border-zinc-700/50 sm:min-w-[180px] sm:max-w-[180px] md:min-w-[150px] md:max-w-[150px] xxl:min-w-[105px] xxl:max-w-[105px]"
				}`}
			>
				<Image
					src={image}
					alt={imageAlt}
					fill
					quality={90}
					className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000 ease-out ${
						section ? "rounded-lg" : "rounded-[18px]"
					}`}
					sizes={
						section
							? "(max-width: 640px) 120px, 108px"
							: "(max-width: 640px) 220px, (max-width: 1024px) 180px, 150px"
					}
				/>
			</div>
			<div className="flex h-full min-w-0 flex-1 flex-col justify-center">
				<div className="flex items-start justify-between gap-3">
					<button
						type="button"
						onClick={(e) => handleRouteButtonClick(e, `/tag?selected=${tagId}`)}
						className="text-sm tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
					>
						{mainTag}
					</button>
					<Popover post={post} iconSize="lg" hoverBg="[#34373d]" />
				</div>
				<h3
					className="w-full max-h-[70px] break-words text-lg font-sans font-semibold leading-6 line-clamp-3 hyphens-auto"
					title={title}
				>
					{title}
				</h3>
			</div>
		</LocalizedLink>
	);
}
