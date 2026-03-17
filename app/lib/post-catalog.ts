import { slugifyPostValue } from "@/lib/post-shared";

export const FALLBACK_POST_IMAGE =
	"data:image/svg+xml;charset=UTF-8," +
	encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" fill="none">
  <rect width="1200" height="675" fill="#1f2329"/>
  <rect x="52" y="52" width="1096" height="571" rx="32" fill="#2a3038" stroke="#4b5563" stroke-width="2"/>
  <circle cx="316" cy="270" r="88" fill="#4f46e5" fill-opacity="0.28"/>
  <circle cx="914" cy="210" r="126" fill="#f59e0b" fill-opacity="0.14"/>
  <circle cx="808" cy="462" r="72" fill="#06b6d4" fill-opacity="0.18"/>
  <rect x="148" y="432" width="332" height="24" rx="12" fill="#d4d4d8" fill-opacity="0.7"/>
  <rect x="148" y="474" width="492" height="18" rx="9" fill="#a1a1aa" fill-opacity="0.48"/>
  <rect x="148" y="510" width="428" height="18" rx="9" fill="#71717a" fill-opacity="0.58"/>
  <text x="148" y="238" fill="#f4f4f5" font-family="Arial, sans-serif" font-size="58" font-weight="700">DevBlog</text>
</svg>
`);

export type PostListItem = {
	id: string;
	slug: string;
	image: string;
	imageAlt: string;
	mainTag: string;
	tags: string[];
	title: string;
	author: string;
	authorSlug: string;
	date: string;
	views: number;
	bookmarks: number;
	hasStartedReading: boolean;
	percentRead: number;
	description: string;
};

export type PostCatalogResponse = {
	posts: PostListItem[];
	total: number;
};

export type PostTagOption = {
	count: number;
	name: string;
	slug: string;
};

export type PostTagCatalogResponse = {
	mainTags: PostTagOption[];
	otherTags: PostTagOption[];
};

export function getPostSlug(value: string) {
	return slugifyPostValue(value);
}

export function getPostHref(post: Pick<PostListItem, "slug" | "title">) {
	return `/post/${post.slug || getPostSlug(post.title)}`;
}

export function getAuthorHref(
	post: Pick<PostListItem, "author" | "authorSlug">,
) {
	return `/profile/${post.authorSlug || getPostSlug(post.author)}`;
}
