import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa6";

interface IconsProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Icons({ className }: IconsProps) {
	const socialMediaIcons: { Icon: IconType; link: string }[] = [
		{ Icon: FaTwitter, link: "https://twitter.com/rayan6ms" },
		{ Icon: FaLinkedin, link: "https://www.linkedin.com/in/rayan6ms/" },
		{ Icon: FaYoutube, link: "https://www.youtube.com/@migole" },
		{ Icon: FaGithub, link: "https://github.com/rayan6ms" },
	];

	return (
		<div className={`flex flex-wrap items-center gap-2 ${className}`}>
			{socialMediaIcons.map(({ Icon, link }) => (
				<a
					key={link}
					href={link}
					target="_blank"
					rel="noreferrer"
					className="group flex rounded-2xl border border-zinc-700/60 bg-greyBg/75 p-3 antialiased transition-colors hover:border-zinc-500/70 hover:bg-greyBg"
				>
					<Icon className="text-lg text-wheat transition-colors ease-in-out group-hover:text-purpleContrast" />
				</a>
			))}
		</div>
	);
}
