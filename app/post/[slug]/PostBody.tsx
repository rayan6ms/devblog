import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARKDOWN_ARTICLE_CLASS, markdownComponents } from "@/lib/markdown";

export default function PostBody({ markdown }: { markdown: string }) {
	return (
		<article
			className={MARKDOWN_ARTICLE_CLASS}
			data-reading-progress-root="true"
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={markdownComponents}
			>
				{markdown}
			</ReactMarkdown>
		</article>
	);
}
