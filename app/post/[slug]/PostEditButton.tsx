"use client";

import { useRouter } from "next/navigation";
import { FaPenToSquare } from "react-icons/fa6";
import { useClientAuth } from "@/components/useClientAuth";

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
	const router = useRouter();
	const { activeUser, isAuthed, isLoading, profile, role } = useClientAuth();
	const normalize = (value?: string | null) => value?.trim().toLowerCase() || "";
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
			aria-label="Edit post"
			title="Edit post"
			onClick={() => router.push(`/post/${slug}/edit`)}
			className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-darkBg/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
		>
			<FaPenToSquare className="text-sm text-zinc-100" />
			<span>Edit</span>
		</button>
	);
}
