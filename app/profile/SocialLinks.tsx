import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa6";

type SocialLink = {
	provider: string;
	icon: IconType;
	bgColor: string;
	hoverBgColor: string;
	url: string;
};

type SocialLinksProps = {
	links: Record<string, string>;
};

function SocialLinkItem({ link }: { link: SocialLink }) {
	const Icon = link.icon;

	return (
		<a
			href={link.url}
			className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm text-zinc-100 transition-all duration-300 ${link.bgColor} ${link.hoverBgColor}`}
			target="_blank"
			rel="noopener noreferrer"
		>
			<Icon className="text-base" />
			<span>{link.provider}</span>
		</a>
	);
}

function isValidHttpUrl(s?: string) {
	if (!s) return false;
	try {
		const u = new URL(s);
		return u.protocol === "http:" || u.protocol === "https:";
	} catch {
		return false;
	}
}

export default function SocialLinks({ links }: SocialLinksProps) {
	const socialLinks: SocialLink[] = [
		{
			provider: "LinkedIn",
			icon: FaLinkedin,
			bgColor: "bg-blue-500/15 border-blue-400/30",
			hoverBgColor: "hover:bg-blue-500/25",
			url: links.linkedin,
		},
		{
			provider: "GitHub",
			icon: FaGithub,
			bgColor: "bg-zinc-800/80 border-zinc-600/40",
			hoverBgColor: "hover:bg-zinc-700/80",
			url: links.github,
		},
		{
			provider: "YouTube",
			icon: FaYoutube,
			bgColor: "bg-red-500/15 border-red-400/30",
			hoverBgColor: "hover:bg-red-500/25",
			url: links.youtube,
		},
		{
			provider: "Twitter",
			icon: FaTwitter,
			bgColor: "bg-sky-500/15 border-sky-400/30",
			hoverBgColor: "hover:bg-sky-500/25",
			url: links.twitter,
		},
	];

	const active = socialLinks.filter((link) => isValidHttpUrl(link.url));

	if (active.length === 0) {
		return null;
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{active.map((link) => (
				<SocialLinkItem key={link.provider} link={link} />
			))}
		</div>
	);
}
