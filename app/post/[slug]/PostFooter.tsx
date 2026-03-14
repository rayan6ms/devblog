import Link from "next/link";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa6";
import { getPostSlug, type IPost } from "@/data/posts";

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export default function PostFooter({ post }: { post: IPost }) {
	const authorHandle = getPostSlug(post.author);
	const authorDescription = `${post.author} writes around ${post.mainTag}, with recurring threads in ${post.tags
		.slice(0, 2)
		.join(" and ")}. This author block now follows the same card style as the rest of the archive instead of relying on hardcoded placeholder assets.`;
	const authorSocials: { icon: IconType; link: string }[] = [
		{
			icon: FaTwitter,
			link: `https://twitter.com/${authorHandle}`,
		},
		{
			icon: FaLinkedin,
			link: `https://www.linkedin.com/in/${authorHandle}`,
		},
		{
			icon: FaYoutube,
			link: `https://www.youtube.com/@${authorHandle}`,
		},
		{
			icon: FaGithub,
			link: `https://github.com/${authorHandle}`,
		},
	];

	return (
		<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/85 p-6 shadow-lg shadow-zinc-950/10">
			<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
				Author
			</p>

			<div className="mt-5 flex items-start gap-4">
				<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-zinc-700/60 bg-darkBg/60 text-lg font-semibold text-wheat">
					{getInitials(post.author)}
				</div>

				<div className="min-w-0">
					<Link
						href={`/profile/${authorHandle}`}
						rel="author"
						className="text-xl font-semibold text-zinc-100 transition-colors hover:text-wheat"
					>
						{post.author}
					</Link>
					<p className="mt-3 text-sm leading-7 text-zinc-400">
						{authorDescription}
					</p>
				</div>
			</div>

			<div className="mt-5 flex flex-wrap gap-2">
				<Link
					className="rounded-full border border-zinc-700/60 bg-darkBg/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
					href={`/profile/${authorHandle}`}
				>
					Posts do autor
				</Link>
				<Link
					className="rounded-full border border-zinc-700/60 bg-darkBg/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
					href={`/tag?selected=${getPostSlug(post.mainTag)}`}
				>
					More in {post.mainTag}
				</Link>
			</div>

			<div className="mt-6 flex flex-wrap gap-3">
				{authorSocials.map(({ icon: Icon, link }) => (
					<a
						key={link}
						href={link}
						target="_blank"
						rel="noreferrer"
						className="group flex rounded-2xl border border-zinc-700/60 bg-darkBg/60 p-3 transition-colors hover:border-zinc-500/70"
					>
						<Icon className="text-base text-wheat transition-colors group-hover:text-purpleContrast" />
					</a>
				))}
			</div>
		</section>
	);
}
