import Footer from "@/components/Footer";
import prisma from "@/database/prisma";
import { auth } from "@/lib/auth";
import { canWriteRole } from "@/lib/post-shared";
import { getPostEditorMainTags } from "@/lib/posts";
import Form from "./Form";

export default async function Page() {
	const session = await auth();
	const userId = session?.user?.id || null;
	const role = (session?.user?.role || "member").toLowerCase();
	const hasPermission = Boolean(userId && canWriteRole(role));
	const [mainTags, currentUser] = hasPermission
		? await Promise.all([
				getPostEditorMainTags(),
				prisma.user.findUnique({
					where: { id: userId! },
					select: {
						name: true,
						username: true,
						slug: true,
					},
				}),
			])
		: [[], null];

	if (!hasPermission) {
		return (
			<>
				<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
						<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								New Post
							</p>
							<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
								Author access required
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
								This page is reserved for contributor accounts. Sign in with a
								writer-capable profile to draft, review, and publish posts.
							</p>
						</section>
					</div>
				</main>
				<Footer />
			</>
		);
	}

	return (
		<>
			<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
						<div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
							<div>
								<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
									New Post
								</p>
								<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
									Create a production-ready article
								</h1>
								<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
									Write the real markdown, attach real media, and save directly to
									the backend so the post page renders the exact same content.
								</p>
							</div>

							<div className="flex flex-wrap gap-3 lg:justify-end">
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										Role
									</p>
									<p className="mt-1 text-lg font-semibold capitalize text-zinc-100">
										{role}
									</p>
								</div>
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										Author
									</p>
									<p className="mt-1 text-lg font-semibold text-zinc-100">
										{currentUser?.name || currentUser?.username || currentUser?.slug || "Author"}
									</p>
								</div>
							</div>
						</div>
					</section>

					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-4 py-5 shadow-xl shadow-zinc-950/20 sm:px-6 sm:py-6">
						<Form
							mainTagsOptions={mainTags}
							initialValues={{
								authorName:
									currentUser?.name ||
									currentUser?.username ||
									currentUser?.slug ||
									"Author",
							}}
						/>
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}
