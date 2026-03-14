import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { FaBookmark, FaEye } from "react-icons/fa6";
import { getPostSlug, type IPost } from "@/data/posts";

function formatViews(value: number) {
	return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

export default function PostHeader({ post }: { post: IPost }) {
	const formattedDate = format(parseISO(post.date), "dd MMM yyyy", {
		locale: ptBR,
	}).replace(/ (\w)/, (_match, letter) => ` ${letter.toUpperCase()}`);

	return (
		<section className="overflow-hidden rounded-[28px] border border-zinc-700/50 bg-greyBg/80 shadow-lg shadow-zinc-950/10">
			<div className="grid gap-6 border-b border-zinc-700/50 p-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end sm:p-8">
				<div>
					<div className="flex flex-wrap gap-2">
						<Link
							href={`/tag?selected=${getPostSlug(post.mainTag)}`}
							className="rounded-full border border-purpleContrast/40 bg-purpleContrast/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-wheat transition-colors hover:bg-purpleContrast/25"
						>
							{post.mainTag}
						</Link>
						{post.tags.slice(0, 3).map((tag) => (
							<Link
								key={tag}
								href={`/tag?selected=${getPostSlug(tag)}`}
								className="rounded-full border border-zinc-700/60 bg-darkBg/65 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition-colors hover:border-zinc-500/70 hover:text-wheat"
							>
								{tag}
							</Link>
						))}
					</div>

					<h1 className="mt-5 text-4xl font-somerton uppercase leading-tight text-wheat sm:text-5xl">
						{post.title}
					</h1>
					<p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">
						{post.description}
					</p>
				</div>

				<div className="rounded-[24px] border border-zinc-700/50 bg-darkBg/50 p-5">
					<div className="flex items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-600/60 bg-greyBg/80 text-sm font-semibold text-wheat">
							{getInitials(post.author)}
						</div>
						<div>
							<p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
								Written by
							</p>
							<Link
								href={`/profile/${getPostSlug(post.author)}`}
								className="mt-1 block text-lg font-semibold text-zinc-100 transition-colors hover:text-wheat"
							>
								{post.author}
							</Link>
						</div>
					</div>

					<div className="mt-5 grid gap-3 text-sm text-zinc-400">
						<div className="flex items-center justify-between">
							<span>Published</span>
							<time dateTime={post.date}>{formattedDate}</time>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaEye />
								Views
							</span>
							<span>{formatViews(post.views)}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2">
								<FaBookmark />
								Reading progress
							</span>
							<span>{post.hasStartedReading ? `${post.percentRead}%` : "New"}</span>
						</div>
					</div>
				</div>
			</div>

			<div className="relative h-56 overflow-hidden sm:h-72 lg:h-[20rem]">
				<Image
					fill
					src={post.image}
					alt={post.title}
					className="object-cover"
					sizes="(max-width: 1024px) 100vw, 1200px"
				/>
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,23,26,0.12),rgba(20,23,26,0.5)_72%,rgba(20,23,26,0.72))]" />
			</div>
		</section>
	);
}
