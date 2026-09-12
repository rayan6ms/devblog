"use client";
import { FaArrowRight } from "react-icons/fa6";
import { useI18n } from "./LocaleProvider";
import LocalizedLink from "./LocalizedLink";

export default function SecondSection() {
	const { messages } = useI18n();
	const sections = [
		{
			title: messages.home.recentPosts,
			path: "/recent",
			description: messages.home.recentPostsDescription,
		},
		{
			title: messages.home.browseByTag,
			path: "/popular",
			description: messages.home.browseByTagDescription,
		},
		{
			title: messages.common.tags,
			path: "/tag",
			description: messages.tag.mainTopicsDescription,
		},
	];
	return (
		<div className="browse-grid">
			{sections.map((section) => (
				<LocalizedLink
					key={section.path}
					href={section.path}
					className="browse-link"
				>
					<div>
						<h3>{section.title}</h3>
						<p>{section.description}</p>
					</div>
					<FaArrowRight aria-hidden="true" />
				</LocalizedLink>
			))}
		</div>
	);
}
