import Link from "next/link";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa6";
import { slugifyPostValue, type PostPageData } from "@/lib/post-shared";

const SOCIAL_ICON_MAP: Record<string, IconType> = {
	twitter: FaTwitter,
	linkedin: FaLinkedin,
	youtube: FaYoutube,
	github: FaGithub,
};

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export default function PostFooter({ post }: { post: PostPageData }) {
	const relatedTopics = post.tags.slice(0, 2);
	const authorDescription =
		relatedTopics.length > 0
			? `${post.author.name} writes around ${post.mainTag}, with recurring threads in ${relatedTopics.join(" and ")}.`
			: `${post.author.name} writes around ${post.mainTag}.`;
	const authorSocials = Object.entries(post.author.socialLinks).filter(
		([, link]) => Boolean(link),
	);

	return (
		<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/85 p-6 shadow-lg shadow-zinc-950/10">
			<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
				Author
			</p>

			<div className="mt-5 rounded-[24px] border border-zinc-700/50 bg-darkBg/45 p-5">
				<div className="grid gap-5 sm:grid-cols-[80px_minmax(0,1fr)]">
					{post.author.profilePicture ? (
						<img
							src={post.author.profilePicture}
							alt={post.author.name}
							className="h-20 w-20 rounded-[24px] border border-zinc-700/60 object-cover"
						/>
					) : (
						<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-zinc-700/60 bg-greyBg/75 text-lg font-semibold text-wheat">
							{getInitials(post.author.name)}
						</div>
					)}

					<div className="min-w-0 self-center">
						<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
							Written by
						</p>
						<Link
							href={`/profile/${post.author.slug}`}
							rel="author"
							className="mt-2 block text-2xl font-semibold text-zinc-100 transition-colors hover:text-wheat"
						>
							{post.author.name}
						</Link>
					</div>

					<p className="text-sm leading-7 text-zinc-400 sm:col-span-2">
						{authorDescription}
					</p>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					<Link
						className="rounded-full border border-zinc-700/60 bg-darkBg/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
						href={`/profile/${post.author.slug}`}
					>
						Author profile
					</Link>
					<Link
						className="rounded-full border border-zinc-700/60 bg-darkBg/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
						href={`/tag?selected=${slugifyPostValue(post.mainTag)}`}
					>
						More in {post.mainTag}
					</Link>
				</div>

				{authorSocials.length > 0 ? (
					<div className="mt-6 flex flex-wrap gap-3">
						{authorSocials.map(([provider, link]) => {
							const Icon = SOCIAL_ICON_MAP[provider];
							if (!Icon || !link) {
								return null;
							}

							return (
								<a
									key={provider}
									href={link}
									target="_blank"
									rel="noreferrer"
									className="group flex rounded-2xl border border-zinc-700/60 bg-darkBg/60 p-3 transition-colors hover:border-zinc-500/70"
								>
									<Icon className="text-base text-wheat transition-colors group-hover:text-purpleContrast" />
								</a>
							);
						})}
					</div>
				) : null}
			</div>
		</section>
	);
}
