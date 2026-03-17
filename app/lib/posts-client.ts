import {
	FALLBACK_POST_IMAGE,
	getAuthorHref,
	getPostHref,
	getPostSlug,
	type PostCatalogResponse,
	type PostListItem,
	type PostTagCatalogResponse,
} from "@/lib/post-catalog";

export type IPost = PostListItem;
export type GetRecentPostsResponse = PostCatalogResponse;
export type TagCatalog = PostTagCatalogResponse;

export {
	FALLBACK_POST_IMAGE,
	getAuthorHref,
	getPostHref,
	getPostSlug,
};

async function fetchJson<T>(input: string): Promise<T> {
	const response = await fetch(input, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	return response.json() as Promise<T>;
}

function normalizePost(post: IPost): IPost {
	return {
		...post,
		image: post.image?.trim() || FALLBACK_POST_IMAGE,
		imageAlt: post.imageAlt?.trim() || post.title,
		author: post.author?.trim() || post.authorSlug?.trim() || "",
		authorSlug: post.authorSlug?.trim() || "",
		description: post.description?.trim() || "",
		mainTag: post.mainTag?.trim() || "",
		tags: Array.isArray(post.tags) ? post.tags : [],
		views: typeof post.views === "number" ? post.views : 0,
		bookmarks: typeof post.bookmarks === "number" ? post.bookmarks : 0,
		hasStartedReading: Boolean(post.hasStartedReading),
		percentRead:
			typeof post.percentRead === "number" ? post.percentRead : 0,
	};
}

async function fetchCatalog(params?: {
	sort?: "recent" | "trending" | "recommended";
	page?: number;
	limit?: number;
	query?: string;
	tags?: string[];
}): Promise<PostCatalogResponse> {
	const searchParams = new URLSearchParams();

	if (params?.sort) {
		searchParams.set("sort", params.sort);
	}
	if (params?.page) {
		searchParams.set("page", String(params.page));
	}
	if (params?.limit) {
		searchParams.set("limit", String(params.limit));
	}
	if (params?.query?.trim()) {
		searchParams.set("q", params.query.trim());
	}
	if (params?.tags?.length) {
		searchParams.set("tags", params.tags.join(","));
	}

	const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
	try {
		const data = await fetchJson<PostCatalogResponse>(`/api/post${suffix}`);

		return {
			...data,
			posts: data.posts.map(normalizePost),
		};
	} catch {
		return { posts: [], total: 0 };
	}
}

export async function getSearchSuggestions(query: string) {
	if (!query.trim()) {
		return [];
	}

	const result = await fetchCatalog({ query, limit: 5 });
	return result.posts;
}

export async function getPostsByQuery(query: string) {
	if (!query.trim()) {
		return [];
	}

	const result = await fetchCatalog({ query });
	return result.posts;
}

export async function getPostsByQueryPaginated(
	query: string,
	page = 1,
	limit = 10,
): Promise<GetRecentPostsResponse> {
	if (!query.trim()) {
		return { posts: [], total: 0 };
	}

	return fetchCatalog({ query, page, limit });
}

export async function getRecentPosts(
	page = 1,
	limit?: number,
): Promise<GetRecentPostsResponse> {
	return fetchCatalog({ sort: "recent", page, limit });
}

export async function getTrendingPosts(limit?: number) {
	const result = await fetchCatalog({ sort: "trending", limit });
	return result.posts;
}

export async function getRecommendedPosts(limit?: number) {
	const result = await fetchCatalog({ sort: "recommended", limit });
	return result.posts;
}

export async function getAllPosts(): Promise<IPost[]> {
	const result = await fetchCatalog({ sort: "recent" });
	return result.posts;
}

export async function getFilteredPosts(tagsArray: string[]): Promise<IPost[]> {
	const result = await fetchCatalog({ tags: tagsArray });
	return result.posts;
}

export async function getPostTagCatalog(): Promise<TagCatalog> {
	try {
		return await fetchJson<TagCatalog>("/api/post/tags");
	} catch {
		return {
			mainTags: [],
			otherTags: [],
		};
	}
}
