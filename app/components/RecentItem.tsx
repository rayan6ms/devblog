"use client";

import Image from "next/image";
import { FaEye } from "react-icons/fa6";
import slugify from "slugify";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { getIntlLocale } from "@/lib/i18n";
import { getAuthorHref, getPostHref, type IPost } from "@/lib/posts-client";
import CircleProgress from "./CircleProgress";
import Popover from "./Popover";

interface RecentItemProps {
	post: IPost;
	isBig?: boolean;
	fluid?: boolean;
	compact?: boolean;
}

export default function RecentItem({
	post,
	isBig,
	fluid = false,
	compact = false,
}: RecentItemProps) {
	const { locale } = useI18n();
	const { push } = useLocaleNavigation();
	const {
		image,
		imageAlt,
		mainTag,
		title,
		author,
		views,
		date,
		hasStartedReading,
		percentRead,
	} = post;

	const formattedDate = new Date(date).toLocaleDateString(
		getIntlLocale(locale),
		{
			day: "2-digit",
			month: "short",
			year: "numeric",
		},
	);
	let formattedAuthor =
		author.length > 20 ? `${author.slice(0, 20)}...` : author;
	formattedAuthor = formattedAuthor
		.toLowerCase()
		.replace(/(^|\s)\S/g, (l) => l.toUpperCase());

	const fullFormattedDate = (value: string) =>
		new Date(value).toLocaleDateString(getIntlLocale(locale), {
			weekday: "long",
			day: "2-digit",
			month: "long",
			year: "numeric",
		});

	const formattedViews = (num: number) =>
		num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num;

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
			className={`group flex h-fit flex-col ${compact ? "rounded-[24px]" : "rounded-lg"} ${
				fluid
					? "w-full max-w-none"
					: "w-[360px] sm:w-[460px] md:w-[360px] lg:w-[420px]"
			}
        ${
					isBig
						? fluid
							? "max-h-none"
							: "xxl:w-[600px] xxl:max-h-[720px] md:max-h-[600px] lg:max-h-[550px]"
						: fluid
							? "max-h-none"
							: "lg:max-h-[425px] xxl:w-[320px] xxl:max-h-[360px]"
				}`}
		>
			<div
				className={`relative w-full ${compact ? "rounded-[24px]" : "rounded-lg"} ${
					isBig
						? fluid
							? "h-[320px] lg:h-[420px] xxl:h-[520px]"
							: "h-[280px] sm:h-[340px] lg:h-[380px] xxl:h-[550px]"
						: fluid
							? compact
								? "h-[190px] sm:h-[220px] lg:h-[205px]"
								: "h-[240px] sm:h-[280px] lg:h-[260px]"
							: "h-[220px] sm:h-[270px] xxl:h-[210px]"
				}`}
			>
				<div
					className={`relative h-full w-full overflow-hidden ${compact ? "rounded-[24px]" : "rounded-lg"}`}
				>
					<Image
						src={image}
						alt={imageAlt}
						fill
						className={`rounded-lg shadow-inner object-cover transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000
            w-full h-full`}
						sizes={
							isBig
								? "(max-width: 768px) 100vw, (max-width: 1400px) 420px, 600px"
								: "(max-width: 768px) 100vw, (max-width: 1400px) 420px, 320px"
						}
					/>
					{hasStartedReading && (
						<div className="absolute top-0 left-0 w-full h-full flex justify-center items-center">
							<CircleProgress
								radius={isBig ? 55 : 45}
								stroke={isBig ? 7 : 5}
								progress={percentRead}
							/>
						</div>
					)}
				</div>
				{isBig && (
					<button
						type="button"
						onClick={(e) =>
							handleRouteButtonClick(
								e,
								`/tag?selected=${slugify(mainTag, { lower: true, strict: true })}`,
							)
						}
						className="text-[13px] tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 mt-4 hover:text-purpleContrast capitalize transition-all ease-in-out duration-300 bg-gray-800 px-2 rounded-full hover:text-wheat hover:bg-purpleContrast absolute -bottom-3 right-1/2 translate-x-1/2"
					>
						{mainTag}
					</button>
				)}
			</div>
			{!isBig && (
				<div className="flex items-center justify-between mt-2">
					<button
						type="button"
						onClick={(e) =>
							handleRouteButtonClick(
								e,
								`/tag?selected=${slugify(mainTag, { lower: true, strict: true })}`,
							)
						}
						className="text-[13px] tracking-[.06em] leading-5 w-fit font-sans text-zinc-400 hover:text-purpleContrast uppercase transition-all ease-in-out duration-300"
					>
						{mainTag}
					</button>
					<Popover post={post} iconSize="lg" />
				</div>
			)}
			<div className={`flex ${isBig ? "mt-8 items-start" : "items-start"}`}>
				<p
					className={`max-h-28 ${isBig ? "w-full text-2xl text-center xxl:text-3xl" : "w-fit text-xl"} line-clamp-3 ${isBig ? "mx-auto pl-10 pr-2" : "mt-2"}`}
					title={title}
				>
					{title}
				</p>
				{isBig && <Popover post={post} iconSize="xl" />}
			</div>
			<div
				className={`flex gap-4 pt-2 text-sm text-zinc-400 font-europa ${isBig ? "mx-auto mb-4" : ""}`}
			>
				<button
					type="button"
					onClick={(e) => handleRouteButtonClick(e, getAuthorHref(post))}
					className="text-wheat text-sm hover:text-purpleContrast transition-all ease-in-out"
				>
					{formattedAuthor}
				</button>
				<time title={fullFormattedDate(date)} dateTime={date}>
					{formattedDate}
				</time>
				<p className="flex items-center gap-1">
					<FaEye /> <span>{formattedViews(views)}</span>
				</p>
			</div>
		</LocalizedLink>
	);
}
