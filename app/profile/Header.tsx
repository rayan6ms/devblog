import Image from "next/image";
import type { IconType } from "react-icons";
import {
	FaBolt,
	FaCrown,
	FaHandHoldingHeart,
	FaPenNib,
	FaPenToSquare,
	FaStar,
	FaUser,
} from "react-icons/fa6";
import type { IUser } from "@/data/posts";
import SocialLinks from "./SocialLinks";

const roleStyles: Record<string, { color: string; icon: IconType }> = {
	member: { color: "bg-emerald-500/90", icon: FaUser },
	volunteer: { color: "bg-blue-500/90", icon: FaHandHoldingHeart },
	writer: { color: "bg-cyan-500/90", icon: FaPenNib },
	vip: { color: "bg-pink-600/90", icon: FaStar },
	admin: { color: "bg-red-700", icon: FaCrown },
	owner: { color: "bg-indigo-600", icon: FaBolt },
};

export default function Header({
	user,
	onEdit,
}: {
	user: IUser;
	onEdit?: () => void;
}) {
	const role = (user.role || "member").toLowerCase();
	const { color, icon: RoleIcon } = roleStyles[role] || roleStyles.member;

	return (
		<div className="relative overflow-hidden rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 shadow-xl shadow-zinc-950/20">
			<div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(103,79,248,0.45),transparent_65%),linear-gradient(135deg,rgba(103,79,248,0.32),rgba(34,37,44,0.08))]" />
			<div className="relative px-6 py-8 sm:px-8">
				<button
					type="button"
					onClick={onEdit}
					className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-zinc-500/40 bg-greyBg/75 px-4 py-2 text-sm font-semibold text-zinc-100 transition-colors hover:bg-greyBg"
				>
					<FaPenToSquare />
					Edit profile
				</button>

				<div className="mt-10 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
					<div className="mx-auto h-28 w-28 overflow-hidden rounded-[28px] border-2 border-zinc-200/70 shadow-xl shadow-zinc-950/30 sm:h-32 sm:w-32 lg:mx-0">
						<Image
							className="h-full w-full object-cover"
							src={user.profilePicture}
							width={128}
							height={128}
							alt={`${user.name} profile`}
						/>
					</div>
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
									<h2 className="text-center font-europa text-3xl text-zinc-100 lg:text-left">
										{user.name}
									</h2>
									<div
										className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white ${color}`}
									>
										<RoleIcon className="text-xs" />
										<span className={role === "vip" ? "uppercase" : "capitalize"}>
											{user.role}
										</span>
									</div>
								</div>
								<p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-zinc-300 lg:mx-0 lg:text-left sm:text-base">
									{user.description}
								</p>
							</div>
							<div className="lg:max-w-[360px]">
								<SocialLinks links={user.socialLinks} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
