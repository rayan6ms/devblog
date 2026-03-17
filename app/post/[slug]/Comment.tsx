"use client";

import Image from "next/image";
import { FaChevronDown, FaChevronUp, FaFlag } from "react-icons/fa6";
import slugify from "slugify";
import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { getIntlLocale } from "@/lib/i18n";

interface CommentProps {
	id: number;
	author: string;
	date: string;
	commentText: string;
	upvotes: number;
	downvotes: number;
	avatar: string;
	votes: Record<number, number>;
	userVotes: Record<number, "up" | "down" | null>;
	onVote: (id: number, action: "up" | "down") => void;
	onFlag: (id: number) => void;
}

export default function Comment({
	id,
	author,
	date,
	commentText,
	avatar,
	votes,
	userVotes,
	onVote,
	onFlag,
}: CommentProps) {
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

	function formattedAuthor(a: string) {
		const result = a.length > 20 ? `${a.slice(0, 20)}...` : a;
		return result.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
	}

	const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

	return (
		<div className="flex mt-7 items-start">
			<div className="flex flex-col mr-3">
				<LocalizedLink
					href={`/profile/${slugify(author, { lower: true, strict: true })}`}
				>
					<Image
						className="w-10 h-10 object-cover rounded-full"
						src={avatar}
						alt={author}
						title={author}
						width={40}
						height={40}
					/>
				</LocalizedLink>
				<div className="flex flex-col items-center mt-2">
					<button
						type="button"
						onClick={() => onVote(id, "up")}
						className={`text-gray-300 ${userVotes[id] === "up" && "text-purpleContrast"} hover:text-purpleContrast transition-all`}
					>
						<FaChevronUp />
					</button>
					<span>{votes[id]}</span>
					<button
						type="button"
						onClick={() => onVote(id, "down")}
						className={`text-gray-300 ${userVotes[id] === "down" && "text-purpleContrast"} hover:text-purpleContrast transition-all`}
					>
						<FaChevronDown />
					</button>
				</div>
			</div>

			<div className="flex flex-col w-full h-full px-4">
				<div className="flex justify-between items-center mb-2">
					<div>
						<LocalizedLink
							href={`/profile/${slugify(author, { lower: true, strict: true })}`}
							rel="author"
							className="text-gray-100 font-bold text-lg hover:text-purpleContrast transition-all ease-in-out"
						>
							{formattedAuthor(author)}
						</LocalizedLink>
						<p className="flex gap-1 font-europa text-zinc-300 text-sm">
							<span title={capitalize(fullFormattedDate(date))}>
								{messages.post.postedOn(formattedDate(date))}
							</span>
						</p>
					</div>

					<button
						type="button"
						onClick={() => onFlag(id)}
						className="hover:text-purpleContrast transition-all ease-in-out"
						aria-label={messages.post.reportComment}
						title={messages.post.reportComment}
					>
						<FaFlag />
					</button>
				</div>

				<p className="text-zinc-400">{commentText}</p>
			</div>
		</div>
	);
}
