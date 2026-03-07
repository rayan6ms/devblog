"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import {
	getComments,
	getRecentPosts,
	getUser,
	type IComment,
	type IPost,
	type IUser,
} from "@/data/posts";
import Comments from "../Comments";
import Header from "../Header";
import ProfileEditModal from "../ProfileEditModal";
import Slider from "../Slider";

export default function Profile() {
	const [postsData, setPostsData] = useState<IPost[]>([]);
	const [comments, setComments] = useState<IComment[]>([]);
	const [user, setUser] = useState<IUser>({} as IUser);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const params = useParams<{ id: string }>();

	useEffect(() => {
		async function fetchData() {
			const [{ posts }, commentData, userData] = await Promise.all([
				getRecentPosts(1, 12),
				getComments(),
				getUser(),
			]);

			setPostsData(posts);
			setComments(commentData);

			const raw =
				typeof window !== "undefined"
					? localStorage.getItem("userProfile")
					: null;
			if (raw) {
				try {
					setUser(JSON.parse(raw));
					return;
				} catch {}
			}

			setUser(userData);
		}

		void fetchData();
	}, []);

	async function handleSaveProfile(updated: IUser) {
		setUser(updated);
		if (typeof window !== "undefined") {
			localStorage.setItem("userProfile", JSON.stringify(updated));
		}
	}

	const loading =
		postsData.length === 0 &&
		comments.length === 0 &&
		Object.keys(user || {}).length === 0;
	const profileId = params.id;

	return (
		<>
			<div className="min-h-screen bg-darkBg text-gray">
				<section className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
					{loading ? (
						<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-16 text-center shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
								Loading profile
							</p>
							<h1 className="mt-4 text-3xl font-somerton uppercase text-wheat">
								Preparing the page
							</h1>
						</div>
					) : (
						<div className="grid gap-6">
							<div className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
								<div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
									<div className="max-w-3xl">
										<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
											Profile overview
										</p>
										<h1 className="mt-3 text-4xl font-somerton uppercase text-wheat sm:text-5xl">
											{profileId === "me" ? "Your profile" : user.name}
										</h1>
										<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
											A cleaner profile layout with the same data, but framed like
											the rest of the site instead of stacking unrelated blocks on
											top of each other.
										</p>
									</div>
									<div className="grid gap-3 sm:grid-cols-3">
										<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
											<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
												Bookmarks
											</p>
											<p className="mt-2 text-3xl font-semibold text-wheat">
												{postsData.length}
											</p>
										</div>
										<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
											<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
												Viewed posts
											</p>
											<p className="mt-2 text-3xl font-semibold text-wheat">
												{postsData.length}
											</p>
										</div>
										<div className="rounded-2xl border border-zinc-700/50 bg-greyBg/75 px-4 py-4">
											<p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
												Comments
											</p>
											<p className="mt-2 text-3xl font-semibold text-wheat">
												{comments.length}
											</p>
										</div>
									</div>
								</div>

								<Header user={user} onEdit={() => setIsEditOpen(true)} />
							</div>

							<div className="grid gap-6 xl:grid-cols-2">
								<Slider title="Bookmarks" items={postsData} />
								<Slider title="Viewed Posts" items={postsData} />
							</div>

							<Comments comments={comments} />
						</div>
					)}
				</section>
			</div>
			<ProfileEditModal
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				initialUser={user}
				onSave={handleSaveProfile}
			/>
			<Footer />
		</>
	);
}
