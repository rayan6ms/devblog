import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import LocalizedLink from "@/components/LocalizedLink";
import { auth } from "@/lib/auth";
import { getCommentsForPost } from "@/lib/comments";
import { getMessages } from "@/lib/i18n";
import { canEditPost, canViewPost, slugifyPostValue } from "@/lib/post-shared";
import {
	getLocalizedPostBySlugWithAuthor,
	getRelatedPosts,
	mapPostForPage,
} from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import {
	buildLocalizedUrl,
	buildPageMetadata,
	resolveAbsoluteSeoImage,
	serializeJsonLd,
	SITE_NAME,
} from "@/lib/seo";
import CommentSection from "./CommentSection";
import PostBody from "./PostBody";
import PostEditButton from "./PostEditButton";
import PostFooter from "./PostFooter";
import PostHeader from "./PostHeader";
import ReadingProgressTracker from "./ReadingProgressTracker";

type PostPageProps = PageProps<"/post/[slug]">;

export async function generateMetadata({
	params,
}: PostPageProps): Promise<Metadata> {
	const { slug } = await params;
	const locale = await getRequestLocale();
	const session = await auth();
	const postRecord = await getLocalizedPostBySlugWithAuthor(slug, locale);

	if (!postRecord || !canViewPost(postRecord, session?.user)) {
		return buildPageMetadata({
			title: "Post unavailable",
			description: "This post is not available for indexing.",
			path: `/post/${slug}`,
			locale,
			index: false,
		});
	}

	const post = mapPostForPage(postRecord, locale);
	const modifiedTime =
		postRecord.lastEditedAt?.toISOString() || postRecord.updatedAt.toISOString();

	return buildPageMetadata({
		title: post.title,
		description: post.description,
		path: `/post/${post.slug}`,
		locale,
		type: "article",
		image: post.thumbnail,
		keywords: [post.mainTag, ...post.tags],
		authors: [post.author.name],
		publishedTime: post.postedAt,
		modifiedTime,
	});
}

export default async function Page({ params }: PostPageProps) {
	const { slug } = await params;
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const session = await auth();
	const postRecord = await getLocalizedPostBySlugWithAuthor(slug, locale);

	if (!postRecord || !canViewPost(postRecord, session?.user)) {
		notFound();
	}

	const post = mapPostForPage(postRecord, locale);
	const canEditCurrentPost = canEditPost(postRecord, session?.user);
	const [relatedPosts, comments] = await Promise.all([
		getRelatedPosts(postRecord, locale, 3),
		postRecord.status === "published"
			? getCommentsForPost(postRecord.id)
			: Promise.resolve([]),
	]);
	const articleJsonLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		description: post.description,
		datePublished: post.postedAt,
		dateModified:
			postRecord.lastEditedAt?.toISOString() || postRecord.updatedAt.toISOString(),
		inLanguage: post.locale,
		mainEntityOfPage: buildLocalizedUrl(`/post/${post.slug}`, locale),
		url: buildLocalizedUrl(`/post/${post.slug}`, locale),
		articleSection: post.mainTag,
		keywords: [post.mainTag, ...post.tags],
		image: [resolveAbsoluteSeoImage(post.thumbnail)],
		author: {
			"@type": "Person",
			name: post.author.name,
			url: buildLocalizedUrl(`/profile/${post.author.slug}`, locale),
		},
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
		},
	};

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: serializeJsonLd(articleJsonLd),
					}}
				/>
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6 lg:px-8">
					<div className="grid gap-6">
						<PostHeader
							post={post}
							editAction={
								canEditCurrentPost ? <PostEditButton slug={slug} /> : null
							}
						/>

						<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
							<div className="min-w-0 rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-5 py-6 shadow-xl shadow-zinc-950/20 sm:px-7 sm:py-7">
								{post.status === "published" ? (
									<ReadingProgressTracker postId={post.id} postSlug={post.slug} />
								) : null}
								<PostBody markdown={post.content} />
								{post.status === "published" ? (
									<CommentSection postId={post.id} initialComments={comments} />
								) : null}
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
