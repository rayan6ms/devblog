"use client";

import { FaPenToSquare } from "react-icons/fa6";
import { useI18n } from "@/components/LocaleProvider";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";

export default function PostEditButton({
	slug,
}: {
	slug: string;
}) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();

	return (
		<button
			type="button"
			aria-label={messages.post.editPost}
			title={messages.post.editPost}
			onClick={() => push(`/post/${slug}/edit`)}
			className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-darkBg/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
		>
			<FaPenToSquare className="text-sm text-zinc-100" />
			<span>{messages.post.edit}</span>
		</button>
	);
}
