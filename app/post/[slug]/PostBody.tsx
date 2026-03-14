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

	return (
		<article
			className="max-w-none text-zinc-300 [&_a]:text-wheat [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-purpleContrast/50 [&_blockquote]:pl-4 [&_blockquote]:text-zinc-400 [&_code]:rounded [&_code]:bg-darkBg/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-somerton [&_h1]:uppercase [&_h1]:text-wheat [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-wheat [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_li]:my-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:leading-8 [&_strong]:text-zinc-100 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
