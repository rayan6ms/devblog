import Avatar from "@/components/Avatar";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa6";
import LocalizedLink from "@/components/LocalizedLink";
import { getMessages } from "@/lib/i18n";
import { type PostPageData, slugifyPostValue } from "@/lib/post-shared";
import { getRequestLocale } from "@/lib/request-locale";

const SOCIAL_ICON_MAP: Record<string, IconType> = {
	twitter: FaTwitter,
	linkedin: FaLinkedin,
	youtube: FaYoutube,
	github: FaGithub,
};

export default async function PostFooter({ post }: { post: PostPageData }) {
	const messages = getMessages(await getRequestLocale());
	const relatedTopics = post.tags.slice(0, 2);
	const authorDescription = messages.post.authorDescription(
		post.author.name,
		post.mainTag,
		relatedTopics,
	);
	const authorSocials = Object.entries(post.author.socialLinks).filter(
		([, link]) => Boolean(link),
	);

	return (
		<section className="surface-panel p-6">

			<div>
				<div className="grid gap-5 sm:grid-cols-[80px_minmax(0,1fr)]">
					<Avatar src={post.author.profilePicture} name={post.author.name} className="h-20 w-20 text-2xl" />

					<div className="min-w-0 self-center">
						<LocalizedLink
							href={`/profile/${post.author.slug}`}
							rel="author"
							className="mt-2 block text-2xl font-semibold text-zinc-100 transition-colors hover:text-wheat"
						>
							{post.author.name}
						</LocalizedLink>
					</div>

					<p className="text-sm leading-7 text-zinc-400 sm:col-span-2">
						{authorDescription}
					</p>
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					<LocalizedLink
						className="ui-button"
						href={`/profile/${post.author.slug}`}
					>
						{messages.post.authorProfile}
					</LocalizedLink>
					<LocalizedLink
						className="ui-button"
						href={`/tag?selected=${slugifyPostValue(post.mainTag)}`}
					>
						{messages.post.moreIn(post.mainTag)}
					</LocalizedLink>
				</div>

				{authorSocials.length > 0 ? (
					<div className="mt-6 flex flex-wrap gap-3">
						{authorSocials.map(([provider, link]) => {
							const Icon = SOCIAL_ICON_MAP[provider];
							if (!Icon || !link) {
								return null;
							}

							return (
								<a
									key={provider}
									href={link}
									target="_blank"
									rel="noreferrer"
									className="icon-button"
									aria-label={provider}
								>
									<Icon className="text-base text-wheat transition-colors group-hover:text-purpleContrast" />
								</a>
							);
						})}
					</div>
				) : null}
			</div>
		</section>
	);
}
