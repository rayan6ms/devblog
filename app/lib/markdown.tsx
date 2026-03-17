/* eslint-disable @next/next/no-img-element */
import type { Components } from "react-markdown";

export const MARKDOWN_ARTICLE_CLASS =
	"max-w-none text-zinc-300 [&_a]:text-wheat [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-purpleContrast/50 [&_blockquote]:bg-darkBg/35 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-zinc-300 [&_code]:rounded [&_code]:bg-darkBg/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.95em] [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-somerton [&_h1]:uppercase [&_h1]:text-wheat [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-wheat [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_hr]:my-10 [&_hr]:border-zinc-700/60 [&_li]:my-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:my-5 [&_p]:text-base [&_p]:leading-8 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-[22px] [&_pre]:border [&_pre]:border-zinc-700/50 [&_pre]:bg-darkBg/85 [&_pre]:p-4 [&_strong]:text-zinc-100 [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-800 [&_td]:border [&_td]:border-zinc-700/50 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-zinc-700/50 [&_th]:bg-darkBg/65 [&_th]:px-3 [&_th]:py-2 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6";

export const markdownComponents: Components = {
	a({ ...props }) {
		return <a {...props} target="_blank" rel="noreferrer" />;
	},
	img({ alt, src }) {
		if (!src) {
			return null;
		}

		return (
			<figure className="my-8 flex flex-col items-center gap-3">
				<img
					src={src}
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
