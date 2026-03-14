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
}: {
	slug: string;
	authorName: string;
}) {
	const router = useRouter();
	const { isAuthed, profile, role } = useClientAuth();
	const allowed =
		isAuthed &&
		(canEditByRole(role) ||
			(profile?.name || "").trim().toLowerCase() ===
				(authorName || "").trim().toLowerCase());

	if (!allowed) return null;

	return (
		<button
			type="button"
			aria-label="Edit post"
			title="Edit post"
			onClick={() => router.push(`/post/${slug}/edit`)}
			className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
		>
			<FaPenToSquare className="text-zinc-100" />
			<span>Edit</span>
		</button>
	);
}
