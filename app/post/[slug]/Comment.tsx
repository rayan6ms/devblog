"use client";

import { FaArrowTrendUp } from "react-icons/fa6";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import type { PostComment } from "@/lib/comments";
import { getIntlLocale } from "@/lib/i18n";

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export default function Comment({ author, postedAt, score, text }: PostComment) {
	const { locale, messages } = useI18n();
	const formattedDate = (d: string) =>
		new Date(d).toLocaleDateString(getIntlLocale(locale), {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

	const fullFormattedDate = (d: string) =>
		new Date(d).toLocaleDateString(getIntlLocale(locale), {
			weekday: "long",
			day: "2-digit",
			month: "long",
			year: "numeric",
		});

	function formattedAuthor(name: string) {
		const result = name.length > 20 ? `${name.slice(0, 20)}...` : name;
		return result.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
	}

	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	return (
		<article className="mt-7 rounded-[24px] border border-zinc-700/50 bg-greyBg/55 p-5">
			<div className="flex items-start justify-between gap-4">
				<LocalizedLink
					href={`/profile/${author.slug}`}
					className="flex items-center gap-3"
				>
					{author.profilePicture ? (
						<img
							className="h-11 w-11 rounded-full border border-zinc-700/60 object-cover"
							src={author.profilePicture}
							alt={author.name}
							title={author.name}
						/>
					) : (
						<div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700/60 bg-darkBg/75 text-sm font-semibold text-wheat">
							{getInitials(author.name)}
						</div>
					)}
					<div>
						<p className="text-lg font-semibold text-zinc-100 transition-all ease-in-out hover:text-purpleContrast">
							{formattedAuthor(author.name)}
						</p>
						<p className="flex gap-1 text-sm text-zinc-400">
							<span title={capitalize(fullFormattedDate(postedAt))}>
								{messages.post.postedOn(formattedDate(postedAt))}
							</span>
						</p>
					</div>
				</LocalizedLink>
				<div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-darkBg/55 px-3 py-1.5 text-sm text-zinc-300">
					<FaArrowTrendUp className={score > 0 ? "text-purpleContrast" : ""} />
					<span>{score}</span>
				</div>
			</div>

			<p className="mt-4 text-zinc-300">{text}</p>
		</article>
	);
}
