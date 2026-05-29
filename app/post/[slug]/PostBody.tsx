import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { PENDING_IMAGE_PREFIX } from "@/lib/image-upload";
import {
	MARKDOWN_ARTICLE_CLASS,
	markdownComponents,
	markdownRehypePlugins,
	markdownRemarkPlugins,
} from "@/lib/markdown";

function allowMissingUploadImageUrls(url: string) {
	if (url.startsWith(PENDING_IMAGE_PREFIX)) {
		return url;
	}

	return defaultUrlTransform(url);
}

export default function PostBody({ markdown }: { markdown: string }) {
	return (
		<article
			className={MARKDOWN_ARTICLE_CLASS}
			data-reading-progress-root="true"
		>
			<ReactMarkdown
				remarkPlugins={markdownRemarkPlugins}
				rehypePlugins={markdownRehypePlugins}
				urlTransform={allowMissingUploadImageUrls}
				components={markdownComponents}
			>
				{markdown}
			</ReactMarkdown>
		</article>
	);
}
