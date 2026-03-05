"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import slugify from "slugify";
import Footer from "@/components/Footer";
import {
	getAllMainTags,
	getAllOtherTags,
	getFilteredPosts,
	type IPost,
} from "../data/posts";
import InfiniteScroller from "./InfiniteScroller";
import SelectedTags from "./SelectedTags";
import Sidebar from "./Sidebar";

const mainTags = getAllMainTags();
const otherTags = getAllOtherTags();
const allTags = [...mainTags, ...otherTags];
const sortedAllTags = allTags.sort((a, b) => a.localeCompare(b));

function isValidTag(tag: string) {
	return sortedAllTags.some(
		(validTag) =>
			validTag.localeCompare(tag, undefined, { sensitivity: "base" }) === 0,
	);
}

function arraysAreEqual(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((val, index) => val === b[index]);
}

function TagsPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [posts, setPosts] = useState<IPost[]>([]);
	const selected = searchParams.get("selected");
	const previousTagsArrayRef = useRef<string[]>([]);
	const selectedTags = useMemo(() => {
		const selectedParam = searchParams.get("selected");
		if (!selectedParam) return [];

		return selectedParam
			.split(",")
			.map((tag) => slugify(tag, { lower: true, strict: true }))
			.filter((tag) => isValidTag(tag));
	}, [searchParams]);

	const handleSelectTag = (tag: string) => {
		const nextTag = slugify(tag, { lower: true, strict: true });

		if (!selectedTags.includes(nextTag)) {
			const newSelectedTags = [...selectedTags, nextTag];
			if (newSelectedTags.length > 5) newSelectedTags.shift();
			router.push(`/tag?selected=${newSelectedTags.join(",")}`);
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const newSelectedTags = selectedTags.filter((tag) => tag !== tagToRemove);
		router.push(
			newSelectedTags.length > 0
				? `/tag?selected=${newSelectedTags.join(",")}`
				: "/tag",
		);
	};

	useEffect(() => {
		let active = true;
		const tagsArray = selected ? selected.split(",").filter(isValidTag) : [];

		if (arraysAreEqual(tagsArray, previousTagsArrayRef.current)) return;
		previousTagsArrayRef.current = tagsArray;

		async function fetchPosts() {
			const filteredPosts = await getFilteredPosts(tagsArray);
			if (!active) return;
			setPosts(filteredPosts);
		}

		if (tagsArray.length > 0) {
			void fetchPosts();
		} else {
			Promise.resolve().then(() => {
				if (active) setPosts([]);
			});
		}

		return () => {
			active = false;
		};
	}, [selected]);

	return (
		<>
			<div className="bg-darkBg min-h-screen text-gray">
				<div className="mt-8 px-12">
					<InfiniteScroller
						tags={mainTags}
						direction="left"
						onSelectTag={handleSelectTag}
					/>
					<InfiniteScroller
						tags={otherTags}
						direction="right"
						onSelectTag={handleSelectTag}
					/>
					<InfiniteScroller
						tags={otherTags.slice().reverse()}
						direction="left"
						onSelectTag={handleSelectTag}
					/>
				</div>
				<div className="container mx-auto p-1.5">
					<div className="flex flex-col md:flex-row mt-4">
						<Sidebar
							tags={sortedAllTags}
							selectedTags={selectedTags}
							onSelectTag={handleSelectTag}
						/>
						<div className="flex-1 ml-4 pr-1.5 overflow-auto max-h-screen">
							<SelectedTags
								tags={selectedTags}
								onRemoveTag={handleRemoveTag}
								onReset={() => router.push("/tag")}
							/>
							<div className="p-2 bg-lessDarkBg flex flex-wrap gap-4 overflow-y-auto">
								{posts.map((post) => (
									<Link
										key={post.title}
										href={`/post/${slugify(post.title, { lower: true, strict: true })}`}
										className="mt-5 mx-2 group h-72 w-64"
									>
										<div className="w-full h-40 mb-2.5 overflow-hidden rounded-xl">
											<Image
												width={280}
												height={160}
												src={post.image}
												alt={post.title}
												className="object-cover rounded-xl transform group-hover:scale-110 transition-transform group-hover:duration-1000 duration-1000
                        w-full h-full"
											/>
										</div>
										<h2 className="text-lg text-zinc-200 mb-1">{post.title}</h2>
										<button
											type="button"
											className="inline-block px-2 py-1 mr-1.5 mt-1 uppercase text-[11px] tracking-[.06em] leading-5 w-fit font-sans bg-gray-800  hover:bg-gray-700 hover:text-purpleContrast rounded-lg text-zinc-400"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleSelectTag(post.mainTag);
											}}
										>
											{post.mainTag}
										</button>
										{post.tags.map((tag) => (
											<button
												key={tag}
												type="button"
												className="inline-block px-2 py-1 mr-1.5 mt-2 uppercase text-[11px] tracking-[.06em] leading-5 w-fit font-sans bg-gray-800  hover:bg-gray-700 hover:text-purpleContrast rounded-lg text-zinc-400"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													handleSelectTag(tag);
												}}
											>
												{tag}
											</button>
										))}
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</>
	);
}

export default function TagsPage() {
	return (
		<Suspense
			fallback={
				<>
					<div className="bg-darkBg min-h-screen" />
					<Footer />
				</>
			}
		>
			<TagsPageContent />
		</Suspense>
	);
}
