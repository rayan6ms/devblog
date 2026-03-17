"use client";

import { FaPenToSquare } from "react-icons/fa6";
import { useI18n } from "@/components/LocaleProvider";
import { useClientAuth } from "@/components/useClientAuth";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";

const canEditByRole = (role?: string) => {
	if (!role) return false;
	const r = role.toLowerCase();
	return r === "admin" || r === "owner";
};

export default function PostEditButton({
	slug,
	authorName,
	authorSlug,
}: {
	slug: string;
	authorName: string;
	authorSlug: string;
}) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();
	const { activeUser, isAuthed, isLoading, profile, role } = useClientAuth();
	const normalize = (value?: string | null) =>
		value?.trim().toLowerCase() || "";
	const matchesAuthor =
		normalize(activeUser) === normalize(authorSlug) ||
		normalize(profile?.username) === normalize(authorSlug) ||
		normalize(profile?.name) === normalize(authorName);
	const allowed =
		isAuthed && !isLoading && (canEditByRole(role) || matchesAuthor);

	if (!allowed) return null;

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
