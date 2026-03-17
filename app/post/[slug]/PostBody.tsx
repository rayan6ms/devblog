import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents, MARKDOWN_ARTICLE_CLASS } from "@/lib/markdown";

export default function PostBody({ markdown }: { markdown: string }) {
	return (
		<article className={MARKDOWN_ARTICLE_CLASS}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={markdownComponents}
			>
				{markdown}
			</ReactMarkdown>
		</article>
	);
}
