import ReactMarkdown from "react-markdown";
import {
	MARKDOWN_ARTICLE_CLASS,
	markdownComponents,
	markdownRehypePlugins,
	markdownRemarkPlugins,
} from "@/lib/markdown";

export default function PostBody({ markdown }: { markdown: string }) {
	return (
		<article
			className={MARKDOWN_ARTICLE_CLASS}
			data-reading-progress-root="true"
		>
			<ReactMarkdown
				remarkPlugins={markdownRemarkPlugins}
				rehypePlugins={markdownRehypePlugins}
				components={markdownComponents}
			>
				{markdown}
			</ReactMarkdown>
		</article>
	);
}
