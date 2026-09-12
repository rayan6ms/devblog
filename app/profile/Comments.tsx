import { useI18n } from "@/components/LocaleProvider";
import LocalizedLink from "@/components/LocalizedLink";
import { getIntlLocale } from "@/lib/i18n-shared";
import type { ProfileComment } from "@/profile/types";

export default function Comments({ comments }: { comments: ProfileComment[] }) {
	const { locale, messages } = useI18n();
	const formatDate = (value: string) => new Date(value).toLocaleDateString(getIntlLocale(locale), { month: "short", day: "numeric", year: "numeric" });
	return (
		<section className="surface-panel min-w-0 p-5 sm:p-6">
			<div className="section-heading"><h2 className="section-title">{messages.profile.comments}</h2><span className="text-sm text-zinc-400">{comments.length}</span></div>
			{comments.length ? <div className="divide-y divide-[var(--line)]">
				{comments.map(comment => <article key={comment.id} className="py-5 first:pt-0 last:pb-0">
					<LocalizedLink href={`/post/${comment.postSlug}`} className="text-link">{comment.postTitle}</LocalizedLink>
					<p className="my-3 break-words text-sm leading-7 text-zinc-300">{comment.content}</p>
					<time dateTime={comment.editedAt || comment.postedAt} className="text-xs text-zinc-400">{comment.edited ? messages.profile.editedOn(formatDate(comment.editedAt || comment.postedAt)) : formatDate(comment.postedAt)}</time>
				</article>)}
			</div> : <p className="text-sm text-zinc-400">{messages.profile.noCommentsYet}</p>}
		</section>
	);
}
