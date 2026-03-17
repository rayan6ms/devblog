"use client";

import Image from "next/image";
import slugify from "slugify";
import LocalizedLink from "@/components/LocalizedLink";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getPostHref, type IPost } from "@/lib/posts-client";
import Popover from "./Popover";

interface RecommendedItemProps {
	post: IPost;
	addSeparation?: boolean;
	section?: boolean;
}

export default function RecommendedItem({
	post,
	addSeparation,
}: RecommendedItemProps) {
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
			className={`group flex
        h-[92px] w-full
        sm:w-[460px]
        md:w-[360px]
        lg:w-[420px]
        xxl:w-[320px]
        box-content ${addSeparation && "mt-5"}`}
		>
			<div className="flex h-full min-w-0 flex-1 flex-col justify-center pr-4">
				<div className="flex justify-between items-center">
					<button
						type="button"
						onClick={(e) => handleRouteButtonClick(e, `/tag?selected=${tagId}`)}
						className="text-xs tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
					>
						{mainTag}
					</button>
					<Popover iconSize="lg" />
				</div>
				<h3
					className="w-full max-h-[70px] text-lg font-sans font-semibold leading-6 line-clamp-3"
					title={title}
				>
					{title}
				</h3>
			</div>
			<div className="relative flex h-[92px] min-w-[92px] max-w-[92px] overflow-hidden rounded-lg">
				<Image
					src={image}
					alt={imageAlt}
					width={120}
					height={120}
					quality={90}
					className="w-full h-full rounded-lg object-cover transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000 ease-out"
				/>
			</div>
		</LocalizedLink>
	);
}
