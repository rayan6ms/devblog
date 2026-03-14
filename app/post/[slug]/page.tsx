import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import {
	getPostBySlug,
	getPostSlug,
	getRelatedPostsBySlug,
	type IPost,
} from "@/data/posts";
import CommentSection from "./CommentSection";
import PostBody from "./PostBody";
import PostEditButton from "./PostEditButton";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";

type PostPageProps = PageProps<"/post/[slug]">;

function buildMockPostMarkdown(post: IPost) {
	return `# ${post.title}

${post.description}

## Why this post exists

This mock article is now generated from the same data source used elsewhere in devblog. That means the title, summary, author, topic labels, image, and related suggestions all come from the shared mock dataset instead of a separate placeholder screen.

## Main angle

${post.author} is framed here through the lens of **${post.mainTag}**, with related references to ${post.tags
		.slice(0, 3)
		.join(", ")}. The goal is not just to show a headline and body, but to make the route feel like a designed reading page that belongs to the same system as home, recent, tags, and trending.

## What changed

- Removed the hardcoded author image dependency that was breaking the page.
- Pulled the rendered post from the mock data source using the slug.
- Styled the article body and supporting panels using the same bordered-card language already used across the site.
- Added a related-posts panel so the mock content has context beyond a single article shell.

## Reading note

This is still mock content, but the route now behaves like a real post page. If you visit another mock slug, the metadata, hero image, author block, and related links update with it instead of staying static.
`;
}

export default async function Page({ params }: PostPageProps) {
	const { slug } = await params;
	const post = await getPostBySlug(slug);

	if (!post) {
		notFound();
	}

	const relatedPosts = await getRelatedPostsBySlug(slug, 3);
	const markdown = buildMockPostMarkdown(post);

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
					<div className="grid gap-6">
						<div className="flex justify-end">
							<PostEditButton slug={slug} authorName={post.author} />
						</div>

						<PostHeader post={post} />

						<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
							<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
								<PostBody markdown={markdown} />
								<CommentSection />
							</div>

							<aside className="grid gap-6 xl:sticky xl:top-28 xl:self-start">
								<PostFooter post={post} />

								{relatedPosts.length > 0 ? (
									<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/85 p-5 shadow-lg shadow-zinc-950/10">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											Related reading
										</p>
										<h2 className="mt-2 text-2xl font-somerton uppercase text-wheat">
											More from this lane
										</h2>

										<div className="mt-5 grid gap-4">
											{relatedPosts.map((item) => (
												<article
													key={item.title}
													className="overflow-hidden rounded-[24px] border border-zinc-700/50 bg-darkBg/45"
												>
													<Link
														href={`/post/${getPostSlug(item.title)}`}
														className="relative block aspect-[16/10] overflow-hidden"
													>
														<Image
															fill
															src={item.image}
															alt={item.title}
															className="object-cover transition-transform duration-700 hover:scale-105"
															sizes="(max-width: 1280px) 100vw, 320px"
														/>
													</Link>
													<div className="p-4">
														<Link
															href={`/tag?selected=${getPostSlug(item.mainTag)}`}
															className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
														>
															{item.mainTag}
														</Link>
														<Link
															href={`/post/${getPostSlug(item.title)}`}
															className="mt-3 block text-lg font-semibold leading-7 text-wheat transition-colors hover:text-zinc-100"
														>
															{item.title}
														</Link>
														<p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
															{item.description}
														</p>
													</div>
												</article>
											))}
										</div>
									</section>
								) : null}
							</aside>
						</div>
					</div>
				</section>
			</div>
			<Footer />
		</>
	);
}
