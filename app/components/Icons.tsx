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
		<div className={`space-x-4 ${className}`}>
			{socialMediaIcons.map(({ Icon, link }) => (
				<a
					key={link}
					href={link}
					target="_blank"
					rel="noreferrer"
					className="flex border-2 border-wheat rounded-full p-3 group antialiased"
				>
					<Icon
						className="text-wheat
              text-lg
              group-hover:text-purpleContrast
              transition-all ease-in-out"
					/>
				</a>
			))}
		</div>
	);
}
