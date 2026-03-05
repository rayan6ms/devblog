import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export default async function PostBody({ markdown }: { markdown: string }) {
	const html = String(
		await unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeSanitize)
			.use(rehypeStringify)
			.process(markdown),
	);

	return <article dangerouslySetInnerHTML={{ __html: html }} />;
}
