import slugify from "slugify";
import {
	getPostCatalog,
	getPostTagCatalog,
	getPublishedPostList,
} from "@/lib/posts";
import { getRequestLocale } from "@/lib/request-locale";
import TagsPageClient from "./TagsPageClient";

const MAX_SELECTED_TAGS = 5;

type TagsPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readFirst(value?: string | string[]) {
	return Array.isArray(value) ? value[0] : value;
}

function normalizeTagValue(value: string) {
	return slugify(value, { lower: true, strict: true });
}

function isValidTag(tag: string, allTags: string[]) {
	const normalizedTag = normalizeTagValue(tag);
	return allTags.some(
		(validTag) => normalizeTagValue(validTag) === normalizedTag,
	);
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
	const params = await searchParams;
	const locale = await getRequestLocale();
	const tagCatalog = await getPostTagCatalog(locale);
	const allTags = Array.from(
		new Set(
			[...tagCatalog.mainTags, ...tagCatalog.otherTags].map((tag) => tag.name),
		),
	);
	const selectedParam = readFirst(params.selected) || "";
	const uniqueTags = new Set<string>();
	const selectedTags = selectedParam
		.split(",")
		.map((tag) => normalizeTagValue(tag))
		.filter((tag) => {
			if (!isValidTag(tag, allTags) || uniqueTags.has(tag)) {
				return false;
			}

			uniqueTags.add(tag);
			return true;
		})
		.slice(0, MAX_SELECTED_TAGS);
	const posts =
		selectedTags.length > 0
			? (await getPostCatalog({ tagSlugs: selectedTags, locale })).posts
			: await getPublishedPostList(locale);

	return (
		<TagsPageClient
			posts={posts}
			selectedTags={selectedTags}
			tagCatalog={tagCatalog}
		/>
	);
}
