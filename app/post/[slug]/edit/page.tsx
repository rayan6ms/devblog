import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import { auth } from "@/lib/auth";
import { getMessages } from "@/lib/i18n";
import { canEditPost } from "@/lib/post-shared";
import { getPostBySlugWithAuthor, getPostEditorMainTags } from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import Form from "@/new_post/Form";

type EditPostPageProps = PageProps<"/post/[slug]/edit">;

export default async function EditPostPage({ params }: EditPostPageProps) {
	const locale = await getRequestLocale();
	const messages = getMessages(locale);
	const { slug } = await params;
	const session = await auth();
	const post = await getPostBySlugWithAuthor(slug);

	if (!post) {
		notFound();
	}

	if (!canEditPost(post, session?.user)) {
		return (
			<>
				<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-[960px] flex-col gap-8">
						<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								{messages.newPost.editPageEyebrow}
							</p>
							<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
								{messages.newPost.editAccessDeniedTitle}
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
								{messages.newPost.editAccessDeniedDescription}
							</p>
						</section>
					</div>
				</main>
				<Footer />
			</>
		);
	}

	const mainTags = await getPostEditorMainTags();
	const authorName =
		post.author.name ||
		post.author.username ||
		post.author.slug ||
		messages.newPost.defaultAuthor;

	return (
		<>
			<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
							{messages.newPost.editPageEyebrow}
						</p>
						<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
							{messages.newPost.editPageTitle}
						</h1>
						<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
							{messages.newPost.editPageDescription}
						</p>
					</section>

					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-4 py-5 shadow-xl shadow-zinc-950/20 sm:px-6 sm:py-6">
						<Form
							mainTagsOptions={mainTags}
							mode="edit"
							existingSlug={slug}
							initialValues={{
								title: post.title,
								slug: post.slug,
								content: post.content,
								thumbnail: post.thumbnail || "",
								thumbnailAlt: post.thumbnailAlt || "",
								description: post.description || "",
								tags: post.tags,
								mainTag: post.mainTag,
								status: post.status,
								authorName,
							}}
						/>
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}
