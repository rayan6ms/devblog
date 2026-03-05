"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaPenToSquare } from "react-icons/fa6";
import { getUser, type IUser } from "@/data/posts";

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
	const [allowed, setAllowed] = useState(false);

	useEffect(() => {
		(async () => {
			const local =
				typeof window !== "undefined"
					? localStorage.getItem("userProfile")
					: null;
			if (local) {
				try {
					const u = JSON.parse(local) as IUser;
					setAllowed(
						canEditByRole(u.role) ||
							(u.name || "").trim().toLowerCase() ===
								(authorName || "").trim().toLowerCase(),
					);
					return;
				} catch {}
			}
			const u = await getUser();
			setAllowed(
				canEditByRole(u.role) ||
					(u.name || "").trim().toLowerCase() ===
						(authorName || "").trim().toLowerCase(),
			);
		})();
	}, [authorName]);

	if (!allowed) return null;

	return (
		<button
			type="button"
			aria-label="Edit post"
			title="Edit post"
			onClick={() => router.push(`/post/${slug}/edit`)}
			className="absolute text-sm top-4 right-4 space-x-0.5 px-1 rounded-md border border-zinc-600/40 bg-zinc-800/70 hover:bg-zinc-800 transition"
		>
			<FaPenToSquare className="text-zinc-100" />
			<span>Edit</span>
		</button>
	);
}
