import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa6";

type SocialLink = {
	provider: string;
	icon: IconType;
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
			className="ui-button"
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
			url: links.linkedin,
		},
		{
			provider: "GitHub",
			icon: FaGithub,
			url: links.github,
		},
		{
			provider: "YouTube",
			icon: FaYoutube,
			url: links.youtube,
		},
		{
			provider: "Twitter",
			icon: FaTwitter,
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
