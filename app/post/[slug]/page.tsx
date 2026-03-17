import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import LocalizedLink from "@/components/LocalizedLink";
import { auth } from "@/lib/auth";
import { getMessages } from "@/lib/i18n";
import { canViewPost, slugifyPostValue } from "@/lib/post-shared";
import {
	getPostBySlugWithAuthor,
	getRelatedPosts,
	mapPostForPage,
} from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import CommentSection from "./CommentSection";
import PostBody from "./PostBody";
import PostEditButton from "./PostEditButton";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";
import ReadingProgressTracker from "./ReadingProgressTracker";

type PostPageProps = PageProps<"/post/[slug]">;

export default async function Page({ params }: PostPageProps) {
	const { slug } = await params;
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const session = await auth();
	const postRecord = await getPostBySlugWithAuthor(slug);

	if (!postRecord || !canViewPost(postRecord, session?.user)) {
		notFound();
	}

	const post = mapPostForPage(postRecord);
	const relatedPosts = await getRelatedPosts(postRecord, 3);

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
					<div className="grid gap-6">
						<PostHeader
							post={post}
							editAction={
								<PostEditButton
									slug={slug}
									authorName={post.author.name}
									authorSlug={post.author.slug}
								/>
							}
						/>

						<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
							<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
								<ReadingProgressTracker postId={post.id} />
								<PostBody markdown={post.content} />
								<CommentSection />
							</div>

							<aside className="grid gap-6 xl:sticky xl:top-28 xl:self-start">
								<PostFooter post={post} />

								{relatedPosts.length > 0 ? (
									<section className="rounded-[28px] border border-zinc-700/50 bg-greyBg/85 p-5 shadow-lg shadow-zinc-950/10">
										<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
											{messages.post.relatedReading}
										</p>
										<h2 className="mt-2 text-2xl font-somerton uppercase text-wheat">
											{messages.post.moreFromThisLane}
										</h2>

										<div className="mt-5 grid gap-4">
											{relatedPosts.map((item) => (
												<article
													key={item.id}
													className="overflow-hidden rounded-[24px] border border-zinc-700/50 bg-darkBg/45"
												>
													<LocalizedLink
														href={`/post/${item.slug}`}
														className="block overflow-hidden"
													>
														{item.thumbnail ? (
															<img
																src={item.thumbnail}
																alt={item.thumbnailAlt}
																className="aspect-[16/10] w-full object-cover transition-transform duration-700 hover:scale-105"
															/>
														) : null}
													</LocalizedLink>
													<div className="p-4">
														<LocalizedLink
															href={`/tag?selected=${slugifyPostValue(item.mainTag)}`}
															className="text-xs uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-wheat"
														>
															{item.mainTag}
														</LocalizedLink>
														<LocalizedLink
															href={`/post/${item.slug}`}
															className="mt-3 block text-lg font-semibold leading-7 text-wheat transition-colors hover:text-zinc-100"
														>
															{item.title}
														</LocalizedLink>
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
