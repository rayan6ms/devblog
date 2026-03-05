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

const SocialLinkItem = ({ link }: { link: SocialLink }) => {
	const Icon = link.icon;
	return (
		<a
			href={link.url}
			className={`${link.bgColor} ${link.hoverBgColor} flex items-center p-2 rounded-md m-1 transition-all duration-300`}
			target="_blank"
			rel="noopener noreferrer"
		>
			<Icon className="text-white" />
			<span className="ml-2 text-zinc-200">{link.provider}</span>
		</a>
	);
};

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
			bgColor: "bg-blue-500/75",
			hoverBgColor: "hover:bg-blue-600/80 border border-blue-500/50",
			url: links.linkedin,
		},
		{
			provider: "GitHub",
			icon: FaGithub,
			bgColor: "bg-gray-800",
			hoverBgColor: "hover:bg-gray-900/70 border border-gray-600/50",
			url: links.github,
		},
		{
			provider: "YouTube",
			icon: FaYoutube,
			bgColor: "bg-red-600/80",
			hoverBgColor: "hover:bg-red-700/80 border border-red-500/70",
			url: links.youtube,
		},
		{
			provider: "Twitter",
			icon: FaTwitter,
			bgColor: "bg-blue-500",
			hoverBgColor: "hover:bg-blue-500/75 border border-blue-400/50",
			url: links.twitter,
		},
	];

	const active = socialLinks.filter((l) => isValidHttpUrl(l.url));

	if (active.length === 0) {
		return null;
	}

	return (
		<div className="xs:flex grid grid-cols-2 md:items-center justify-center md:w-auto w-full bg-zinc-800/60 p-1 rounded-xl border border-zinc-500/30 shadow-md">
			{active.map((link) => (
				<SocialLinkItem key={link.provider} link={link} />
			))}
		</div>
	);
}
