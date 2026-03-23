/* eslint-disable @next/next/no-img-element */
import { Children, isValidElement, type ReactNode } from "react";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

export const MARKDOWN_ARTICLE_CLASS =
	"markdown-article max-w-none text-zinc-300 [&_a]:text-wheat [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-purpleContrast/50 [&_blockquote]:bg-darkBg/35 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-zinc-300 [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-somerton [&_h1]:uppercase [&_h1]:text-wheat [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-wheat [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_hr]:my-10 [&_hr]:border-zinc-700/60 [&_li]:my-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:leading-8 [&_strong]:text-zinc-100 [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800 [&_td]:border [&_td]:border-zinc-700/50 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-zinc-700/50 [&_th]:bg-darkBg/65 [&_th]:px-3 [&_th]:py-2 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6";

export const markdownRemarkPlugins: PluggableList = [remarkGfm];

export const markdownRehypePlugins: PluggableList = [
	[rehypeHighlight, { detect: true }],
];

type MarkdownComponentOptions = {
	resolveImageSrc?: (src: string) => string;
};

function getCodeLanguage(children: ReactNode) {
	for (const child of Children.toArray(children)) {
		if (!isValidElement<{ className?: string }>(child)) {
			continue;
		}

		const className = child.props.className;
		if (typeof className !== "string") {
			continue;
		}

		const match = className.match(/(?:lang|language)-([a-z0-9-]+)/i);
		if (match) {
			return match[1].toLowerCase();
		}
	}

	return null;
}

export function createMarkdownComponents({
	resolveImageSrc,
}: MarkdownComponentOptions = {}): Components {
	return {
		a({ ...props }) {
			return <a {...props} target="_blank" rel="noreferrer" />;
		},
		pre({ children, ...props }) {
			const language = getCodeLanguage(children);
			return (
				<pre
					{...props}
					data-language={language || undefined}
					spellCheck="false"
				>
					{children}
				</pre>
			);
		},
		img({ alt, src }) {
			if (typeof src !== "string" || !src) {
				return null;
			}

			const resolvedSrc = resolveImageSrc?.(src) || src;
			return (
				<figure className="my-8 flex flex-col items-center gap-3">
					<img
						src={resolvedSrc}
						alt={alt || ""}
						className="max-h-[32rem] w-auto max-w-full rounded-[24px] border border-zinc-700/50 bg-darkBg/45 object-contain shadow-lg shadow-zinc-950/15"
					/>
					{alt ? (
						<figcaption className="text-center text-sm text-zinc-500">
							{alt}
						</figcaption>
					) : null}
				</figure>
			);
		},
	};
}

export const markdownComponents = createMarkdownComponents();
