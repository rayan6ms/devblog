"use client";
import {
	FaGithub,
	FaLinkedin,
	FaRss,
	FaTwitter,
	FaYoutube,
} from "react-icons/fa6";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";
const socials = [
	{ href: "https://github.com/rayan6ms", icon: FaGithub, label: "GitHub" },
	{ href: "https://twitter.com/rayan6ms", icon: FaTwitter, label: "Twitter" },
	{
		href: "https://linkedin.com/in/rayan6ms",
		icon: FaLinkedin,
		label: "LinkedIn",
	},
	{ href: "https://youtube.com/@migole", icon: FaYoutube, label: "YouTube" },
	{ href: "/feed.xml", icon: FaRss, label: "RSS" },
];
const links = [
	{ href: "/recent", key: "recent" },
	{ href: "/tag", key: "tags" },
	{ href: "/about", key: "about" },
	{ href: "/playground", key: "playground" },
] as const;
export default function Footer() {
	const { messages } = useI18n();
	return (
		<footer className="site-footer">
			<div className="site-container">
				<div className="footer-row">
					<div>
						<LocalizedLink href="/" className="wordmark">
							devblog
						</LocalizedLink>
						<p>{messages.footer.title}</p>
					</div>
					<nav className="footer-links" aria-label={messages.footer.navigate}>
						{links.map((link) => (
							<LocalizedLink key={link.href} href={link.href}>
								{messages.common[link.key]}
							</LocalizedLink>
						))}
					</nav>
				</div>
				<div className="footer-bottom">
					<p>© {new Date().getFullYear()} devblog</p>
					<div className="footer-socials">
						{socials.map(({ href, icon: Icon, label }) => (
							<a
								className="icon-button"
								key={href}
								href={href}
								aria-label={label}
								target={href.startsWith("http") ? "_blank" : undefined}
								rel="noopener noreferrer"
							>
								<Icon aria-hidden="true" />
							</a>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
}
