export const LOCALES = ["en", "pt-BR", "es", "de", "ru", "fr", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "devblog-locale";
export const LOCALE_QUERY_PARAM = "lang";
export const LOCALE_HEADER = "x-devblog-locale";

const LOCALE_TO_INTL: Record<Locale, string> = {
	en: "en-US",
	"pt-BR": "pt-BR",
	es: "es-ES",
	de: "de-DE",
	ru: "ru-RU",
	fr: "fr-FR",
	ja: "ja-JP",
};

export const localeOptions = [
	{ shortLabel: "EN", value: "en", label: "English" },
	{ shortLabel: "PT", value: "pt-BR", label: "Português (Brasil)" },
	{ shortLabel: "ES", value: "es", label: "Español" },
	{ shortLabel: "DE", value: "de", label: "Deutsch" },
	{ shortLabel: "RU", value: "ru", label: "Русский" },
	{ shortLabel: "FR", value: "fr", label: "Français" },
	{ shortLabel: "JA", value: "ja", label: "日本語" },
] as const;

export function getLocaleLabel(locale: Locale) {
	return (
		localeOptions.find((option) => option.value === locale)?.label || locale
	);
}

export function resolveLocale(value?: string | null): Locale | null {
	if (!value) {
		return null;
	}

	const normalized = value.trim().toLowerCase();

	if (normalized === "en" || normalized === "en-us") {
		return "en";
	}

	if (normalized === "pt" || normalized === "pt-br" || normalized === "pt_br") {
		return "pt-BR";
	}

	if (normalized === "es" || normalized === "es-es") {
		return "es";
	}

	if (normalized === "de" || normalized === "de-de") {
		return "de";
	}

	if (normalized === "ru" || normalized === "ru-ru") {
		return "ru";
	}

	if (normalized === "fr" || normalized === "fr-fr") {
		return "fr";
	}

	if (normalized === "ja" || normalized === "ja-jp") {
		return "ja";
	}

	return null;
}

export function getIntlLocale(locale: Locale) {
	return LOCALE_TO_INTL[locale];
}

export function isExternalHref(href: string) {
	return /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(href);
}

export function withLocaleQuery(href: string, locale: Locale) {
	if (!href || isExternalHref(href)) {
		return href;
	}

	const [withoutHash, hash = ""] = href.split("#");
	const [pathname = "", rawQuery = ""] = withoutHash.split("?");
	const params = new URLSearchParams(rawQuery);
	params.set(LOCALE_QUERY_PARAM, locale);
	const query = params.toString();

	return `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

type MessageDictionary = typeof dictionaries.en;

const dictionaries = {
	en: {
		common: {
			home: "Home",
			recent: "Recent",
			trending: "Trending",
			tags: "Tags",
			about: "About",
			playground: "Playground",
			profile: "Profile",
			create: "Create",
			suggest: "Suggest",
			login: "Login",
			logout: "Logout",
			telegram: "Telegram",
			search: "Search",
			close: "Close",
			cancel: "Cancel",
			results: "Results",
			page: "Page",
			views: "Views",
			bookmarks: "Bookmarks",
			comments: "Comments",
			author: "Author",
			edited: "Edited",
			published: "Published",
			lastSaved: "Last saved",
			readTime: "Read time",
			minutesShort: "min",
			previous: "Previous",
			next: "Next",
			loadingProfile: "Loading profile",
			preparingPage: "Preparing the page",
			noItemsYet: "No items to show yet.",
			noDescriptionYet: "No profile description yet.",
			percentComplete: (progress: number) => `${progress}% complete`,
		},
		language: {
			label: "Language",
			ariaLabel: "Change site language",
			menuTitle: "Choose language",
		},
		header: {
			eyebrow: "Personal dev blog",
			description:
				"Tutorials, opinions, frontend notes, and interactive side projects collected in one place.",
			suggestTitle: "Suggest a post (requires review)",
			homeAria: "Home",
		},
		nav: {
			navigation: "Navigation",
			openMenu: "Open navigation menu",
			closeMenu: "Close navigation menu",
		},
		footer: {
			title: "Posts, experiments, interface work.",
			description:
				"A personal development blog with writing, interaction studies, and a playground for ideas that are easier to show than describe.",
			navigate: "Navigate",
			socials: "Socials",
			closing: "Articles, UI experiments, and interactive side work.",
		},
		popover: {
			aria: "Post actions",
			save: "Save to bookmarks",
			share: "Share",
			moreLikeThis: "More posts like this",
			lessLikeThis: "Fewer posts like this",
		},
		home: {
			startHere: "Start here",
			title: "A personal dev blog with room to explore",
			description:
				"DevBlog is where I publish development writing, opinions, tutorials, and experiments. The front page highlights featured reading, what is trending now, and quick ways to branch into the rest of the blog.",
			featuredPosts: "Featured posts",
			trendingPicks: "Trending picks",
			recommended: "Recommended",
			trendingSnapshot: "Trending snapshot",
			trendingTitle: "What is getting attention now",
			trendingDescription:
				"A fast scan of the posts currently pulling readers in, kept in the same place as before but with stronger section framing.",
			exploreFurther: "Explore further",
			exploreTitle: "More ways into the blog",
			exploreDescription:
				"Use these sections to move between what is new, what is getting attention, and the posts worth revisiting.",
			editorPicks: "Editor picks",
			noRecommended:
				"No recommended posts yet. Publish a few entries and this section will fill itself from the live database.",
			noPosts:
				"No posts are published yet. The homepage is connected to Prisma now, so sections will populate as soon as real posts exist.",
			scrollToTrending: "Scroll to trending posts",
			noTrending:
				"No trending posts yet. Once published posts start collecting views, they will appear here automatically.",
			explore: "Explore",
			trendingPosts: "Trending posts",
			trendingPostsDescription:
				"See what is pulling the most attention right now.",
			recentPosts: "Recent posts",
			recentPostsDescription:
				"Start with the newest writing and work backward from there.",
			browseByTag: "Browse by tag",
			browseByTagDescription:
				"Filter the live post catalog by topic and supporting tags.",
			noSectionPost: "No post is available for this section yet.",
			noRecommendedCallouts:
				"Recommended callouts will appear here after more posts are published.",
			viewSection: "View section",
		},
		notFound: {
			description: "The page you are looking for could not be found.",
			backHome: "Back to the home page",
		},
		searchBar: {
			placeholder: "Search posts",
			ariaLabel: "Search posts",
			openSearch: "Open search",
			searchSuggestions: "Search suggestions",
			viewAllResults: "View all results",
		},
		suggestModal: {
			title: "Suggest a post",
			close: "Close suggest post modal",
			fieldTitle: "Title",
			titlePlaceholder: "e.g. Understanding React Server Components in Next 14",
			fieldIdea: "What is the idea?",
			ideaPlaceholder:
				"Add a short outline, bullet points, or links for context (optional).",
			reviewNote:
				"Your suggestion will be reviewed before publishing. Please avoid sensitive data or personal info.",
			submitted: "Submitted!",
			submitting: "Submitting...",
			submit: "Submit suggestion",
			titleTooShort: (min: number) =>
				`Title must be at least ${min} characters.`,
			maxChars: (max: number) => `Max ${max} characters.`,
		},
		about: {
			eyebrow: "About devblog",
			title: "A place to write, experiment, and keep shipping",
			description:
				"This site is where writing, interface work, and side experiments share the same frame. It is meant to stay useful, personal, and active instead of becoming a static portfolio archive.",
			storyCards: [
				{
					label: "Why it exists",
					title: "A blog I actually keep using",
					text: "DevBlog is my personal software development blog. It is where I publish tutorials, opinions, experiments, interface ideas, and the parts of web development I enjoy refining the most.",
				},
				{
					label: "How it is built",
					title: "A practical stack with room for visual work",
					text: "The stack centers on Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser, and a few supporting libraries for data shaping and experiments. The goal is to keep the project practical, simple, and enjoyable to build without losing the visual side of the work.",
				},
				{
					label: "What else lives here",
					title: "Playful tools, sketches, and side ideas",
					text: "Beyond posts, the site leans into interactivity: tag-driven discovery, recommendations, user tools, and a playground full of games and sketches. I am not a game developer, but the playground is a good home for hobby projects and another way to show what I can build.",
				},
			],
		},
		playgroundPage: {
			title: "Games, sketches, and playable detours",
			description:
				"This page is a home for hobby experiments. I am primarily a web developer, not a game developer, but these small projects are a useful way to explore interaction, motion, and browser rendering ideas.",
			totalProjects: "Total projects",
			projects: "Projects",
			playableTitle: "Playable",
			playableDescription:
				"Hands-on experiments you can control directly, from games to toy systems.",
			watchOnlyTitle: "Watch-only",
			watchOnlyDescription:
				"Visual pieces that are better treated like motion studies than score-based games.",
			mode: "Mode",
			loading: "Loading...",
			closeGame: "Close game",
			mobileNoticeTitle: "Desktop-first playground",
			mobileNoticeBody:
				"These projects were designed for larger screens first. You can keep exploring here, but a computer will usually give you the intended layout and controls.",
			badges: {
				playable: "Playable",
				watchOnly: "Watch-only",
			},
			games: {
				chess: { name: "Chess", description: "Classic chess game" },
				snakeGame: {
					name: "Snake Game",
					description: "Classic snake game",
				},
				minesweeper: {
					name: "Minesweeper",
					description: "Minesweeper",
				},
				antSimulator: {
					name: "Ant Simulator",
					description: "Ant colony race",
				},
				solarSystem: {
					name: "Solar System",
					description: "Planetary dance",
				},
				terminal: { name: "Terminal", description: "Linux terminal" },
				tankShooter: {
					name: "Tank Shooter",
					description: "Tank shooter",
				},
				fallingSand: {
					name: "Falling Sand",
					description: "Falling sand",
				},
				movingMountains: {
					name: "Moving Mountains",
					description: "Moving mountains",
				},
				survivalShooter: {
					name: "Survival Shooter",
					description: "Survival shooter",
				},
				tetris: { name: "Tetris", description: "Tetris" },
				binaryPong: {
					name: "Binary Pong",
					description: "Binary pong",
				},
				sineWaves: {
					name: "Sine Waves",
					description: "Sine waves",
				},
				voronoiWall: {
					name: "Voronoi Wall",
					description: "Voronoi wall",
				},
				"2048": { name: "2048", description: "2048" },
				pacman: { name: "Pacman", description: "Pacman" },
				newtonCannon: {
					name: "Newton Cannon",
					description: "Newton cannon",
				},
				flappyBird: {
					name: "Flappy Bird",
					description: "Flappy Bird",
				},
				labyrinthExplorer: {
					name: "Labyrinth Explorer",
					description: "Labyrinth explorer",
				},
			},
		},
		recent: {
			eyebrow: "Latest posts",
			title: "The newest posts, in order",
			description:
				"This page is the clearest view of the blog in publishing order. It keeps the newest writing front and center, with pagination and topic cues close by when you want to keep browsing.",
			postCount: "Post count",
			currentPage: "Current page",
			totalViews: "Total views",
			latestArrival: "Latest arrival",
			noPublished:
				"No published posts yet. Create your first post and it will show up here as the latest arrival.",
			readingGuide: "Reading guide",
			stayOriented: "Stay oriented",
			stayOrientedDescription:
				"Move through the blog page by page, keep an eye on the newest entry, and jump into the topics showing up most often in the latest batch of posts.",
			showingNow: "Showing now",
			pageControls: "Page controls",
			freshTopics: "Fresh topics",
			topicCountsLater:
				"Topic counts will appear here after posts are published.",
			recentPosts: "Recent posts",
			recentPostsTitle: "Newest entries on devblog",
			recentPostsDescription:
				"Ordered strictly by publish date so the page behaves like a true recent-post feed, not a mixed grab bag.",
			noPosts:
				"No posts are available yet. This page now reads straight from the database and will populate as soon as published entries exist.",
			noPublishedShort: "No published posts yet",
			relatedTags: (count: number) =>
				`${count} related ${count === 1 ? "tag" : "tags"}`,
			visibleRange: (start: number, end: number, total: number) =>
				`Posts ${start}-${end} of ${total}`,
			pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
		},
		trending: {
			eyebrow: "Trending now",
			title: "What readers are paying attention to",
			description:
				"The accordion stays as the page signature, but the rest of the page now supports it: ranked posts, visible topic signals, and clearer reasons for why a post is near the top.",
			trackedPosts: "Tracked posts",
			topPost: "Top post",
			totalViews: "Total views",
			noTrending:
				"No trending posts are available yet. This section will populate once published posts start collecting views.",
			trendSignals: "Trend signals",
			topicRadar: "Topic radar",
			topicRadarDescription:
				"Main topics with the strongest presence in the current trending stack. Use them to branch into related posts without losing the context of what is hot right now.",
			topicSignalsLater:
				"Topic signals will appear here after posts are published.",
			leadingPost: "Leading post",
			leadingPostEmpty:
				"No trending leader yet. Publish posts and accumulate views to build this ranking.",
			ranking: "Ranking",
			topMomentum: "Top posts by momentum",
			topMomentumDescription:
				"The most-read posts right now, ordered by views so the list actually reflects a trend instead of a random sample.",
			moreToWatch: "More to watch",
			risingPosts: "Rising posts",
			risingPostsDescription:
				"Posts just below the top tier that still deserve a clear, readable presentation instead of another dense list.",
			notEnoughPosts:
				"There are not enough posts yet for a secondary spotlight list.",
			readPost: "Read post",
			focusPost: (title: string) => `Focus ${title}`,
			viewsSuffix: (count: string) => `${count} views`,
		},
		search: {
			eyebrow: "Search posts",
			description:
				"Browse matching posts across devblog. Results use the same post cards as the rest of the site, with paging when a query spans more than one screen.",
			matches: "Matches",
			noMatch: "No match",
			nothingFound: (query: string) => `Nothing showed up for "${query}".`,
			noMatchDescription:
				"Try a shorter query, search by tag or author, or jump back to the latest posts to keep browsing.",
			seeRecentPosts: "See recent posts",
			resultsFor: (query: string) => `Results for "${query}"`,
		},
		tag: {
			eyebrow: "Browse by tag",
			title: "Discover posts by topic",
			description:
				"Use tags to narrow the blog quickly. Pick a main topic, layer a few supporting tags, and keep the results grid in view while you refine.",
			totalTags: "Total tags",
			selected: "Selected",
			visiblePosts: "Visible posts",
			mainTopics: "Main topics",
			mainTopicsDescription: "The broad categories that shape each post.",
			supportingTags: "Supporting tags",
			supportingTagsDescription:
				"Use these to narrow the grid without losing context.",
			noPostsYet: "No posts yet",
			unlockAfterFirstPost:
				"Tag browsing will unlock after the first published post",
			tagBrowsingDescription:
				"The tag page is now reading the real database, so it will stay empty until there are published posts and tags to show.",
			noMatches: "No matches",
			noPostsFit: "No posts fit this combination",
			noPostsFitDescription:
				"Try removing one of the active tags or switch to a broader main topic. The quick picks in the filter panel are a good reset point.",
			viewsSuffix: (count: string) => `${count} views`,
			filterPosts: "Filter posts",
			findTopic: "Find a topic",
			filterDescription: (max: number) =>
				`Search tags, combine up to ${max}, and narrow the post grid without leaving the page.`,
			searchTags: "Search tags",
			selectedTags: "Selected tags",
			selectedTagsHint:
				"Add another tag to refine further, or reset to broaden the results.",
			selectedTagsEmpty:
				"Start with a broad topic, then layer supporting tags if you need to focus the results.",
			clearFilters: "Clear filters",
			quickPicks: "Quick picks",
			quickPicksDescription: "Popular tags that open the page up fast.",
			tagGroupMainDescription: "Primary categories that define the post.",
			tagGroupOtherDescription: "Secondary details and related subjects.",
			noTagsMatch: "No tags match the current search.",
			resultsSummary: (resultsCount: number, tagCount: number) =>
				`${resultsCount} ${resultsCount === 1 ? "post" : "posts"} matching ${tagCount} ${tagCount === 1 ? "tag" : "tags"}`,
			showingAll: (resultsCount: number) =>
				`Showing all ${resultsCount} ${resultsCount === 1 ? "post" : "posts"}`,
			resultsDescription:
				"Remove a tag to broaden the results or keep combining related topics to stay focused.",
			resultsDescriptionEmpty:
				"Use the quick picks, marquee rows, or the filter panel to drill into a specific theme.",
			resetAll: "Reset all",
			removeTag: (label: string) => `Remove ${label}`,
			noActiveFilters: "No active tag filters.",
		},
		login: {
			eyebrow: "Member access",
			title: "Login",
			email: "Email",
			password: "Password",
			hidePassword: "Hide password",
			showPassword: "Show password",
			continue: "Continue",
			noAccount: "Don't have an account?",
			register: "Register",
			invalidCredentials: "Invalid email or password.",
			unableToLogin: "Unable to login right now.",
		},
		register: {
			eyebrow: "Create access",
			title: "Register",
			name: "Name",
			email: "Email",
			password: "Password",
			confirmPassword: "Confirm password",
			hidePassword: "Hide password",
			showPassword: "Show password",
			createAccount: "Create account",
			haveAccount: "Already have an account?",
			login: "Login",
			unableToCreate: "Unable to create account right now.",
			accountCreatedLoginFailed: "Account created, but automatic login failed.",
			unableToCreateShort: "Unable to create account.",
		},
		profile: {
			overview: "Profile overview",
			yourProfile: "Your profile",
			description:
				"Real account data is now backed by the database, including role, connected providers, persisted profile fields, and live activity counts.",
			loadingTitle: "Preparing the page",
			unavailable: "Profile unavailable",
			goToLogin: "Go to login",
			bookmarks: "Bookmarks",
			viewedPosts: "Viewed posts",
			comments: "Comments",
			handle: "Handle",
			email: "Email",
			role: "Role",
			passwordLogin: "Password login",
			configured: "Configured",
			notSet: "Not set",
			connectedAccounts: "Connected accounts",
			credentialsOnly: "Credentials only",
			editProfile: "Edit profile",
			logout: "Logout",
			profileAlt: (name: string) => `${name} profile`,
			recentActivity: "Recent activity across the blog",
			noCommentsYet: "No comments to show yet.",
			editedOn: (date: string) => `Edited ${date}`,
			itemCount: (count: number) =>
				`${count} ${count === 1 ? "item" : "items"}`,
			loadLoginRequired: "Please login to access your profile.",
			loadNotFound: "This profile could not be found.",
			loadError: "Unable to load this profile right now.",
			saveError: "Unable to save profile.",
		},
		profileEdit: {
			settingsEyebrow: "Profile settings",
			title: "Edit profile",
			closeModal: "Close edit profile modal",
			preview: "Preview",
			previewAlt: "Profile preview",
			providerAvailable: "Provider photo available",
			providerMissing: "No provider photo on file",
			providerPhoto: "Provider photo",
			generatedAvatar: "Generated avatar",
			uploadPhoto: "Upload photo",
			uploadHint: "JPG, PNG, or WEBP up to 2MB.",
			uploadedImageLabel: "Uploaded image",
			uploaded: (name: string) => `Uploaded: ${name}`,
			displayName: "Display name",
			profileUrl: (handle: string) => `Profile URL: \`/profile/${handle}\``,
			description: "Description",
			changePassword: "Change password",
			createPassword: "Create password",
			changePasswordDescription:
				"Update your email login password without losing your social sign-in.",
			createPasswordDescription:
				"Add an email login password to this social account.",
			optional: "Optional",
			currentPassword: "Current password",
			newPassword: "New password",
			confirmNewPassword: "Confirm new password",
			save: "Save profile",
			saving: "Saving...",
		},
		profileValidation: {
			nameRequired: "Name is required.",
			maxChars: (max: number) => `Max ${max} characters.`,
			handleRequired: "Handle is required.",
			handleLettersNumbersOnly: "Use letters and numbers only.",
			handleMin: (min: number) => `Handle must be at least ${min} characters.`,
			handleMax: (max: number) => `Handle must be ${max} characters or fewer.`,
			uploadRequired: "Upload a JPG, PNG, or WEBP image.",
			uploadAllowed: "Only JPG, PNG, or WEBP images are allowed.",
			uploadMaxSize: "Max image size is 2MB.",
			invalidProviderUrl: (provider: string) => `Invalid ${provider} URL.`,
			currentPasswordIncorrect: "Current password is incorrect.",
			handleTaken: "That handle is already taken.",
			unableToSave: "Unable to save profile.",
		},
		newPost: {
			createPageEyebrow: "New Post",
			createPageTitle: "Create a production-ready article",
			createPageDescription:
				"Write the real markdown, attach real media, and save directly to the backend so the post page renders the exact same content.",
			accessRequiredTitle: "Author access required",
			accessRequiredDescription:
				"This page is reserved for contributor accounts. Sign in with a writer-capable profile to draft, review, and publish posts.",
			editPageEyebrow: "Edit Post",
			editPageTitle: "Update article",
			editPageDescription:
				"Refine the metadata, body, or media and save directly back to the same persisted post record.",
			editAccessDeniedTitle: "Access denied",
			editAccessDeniedDescription:
				"Only the author or site administrators can edit this post.",
			role: "Role",
			author: "Author",
			defaultAuthor: "Author",
			language: "Original language",
			languageHelp:
				"This is the language the post was first written in. Translations are attached separately on the edit page.",
			mode: "Mode",
			modeCreating: "Creating",
			modeEditing: "Editing",
			editorEyebrowCreate: "New post",
			editorEyebrowEdit: "Edit post",
			editorTitleCreate: "Build the post before it ships",
			editorTitleEdit: "Refine the published shape",
			editorDescription:
				"The editor persists real markdown, real media paths, and real post metadata to Prisma. What you preview here is what renders on the post page.",
			storySetupEyebrow: "Story setup",
			storySetupTitle: "Lock the metadata first",
			title: "Title",
			titlePlaceholder: "A title that deserves the click",
			slug: "Slug",
			slugPlaceholder: "post-url-slug",
			regenerate: "Regenerate",
			finalUrl: (slug: string) => `Final URL: /post/${slug}`,
			description: "Description",
			generateFromContent: "Generate from content",
			descriptionPlaceholder:
				"What should the reader understand before opening the article?",
			visualsEyebrow: "Visuals",
			visualsTitle: "Set the post thumbnail",
			thumbnail: "Thumbnail",
			thumbnailDescription:
				"This drives the hero image on the post page and the card thumbnail everywhere else.",
			upload: "Upload",
			uploading: "Uploading...",
			thumbnailPreviewAlt: "Post thumbnail",
			thumbnailEmpty: "Upload the image that should represent the post.",
			thumbnailUploaded: "Thumbnail uploaded.",
			thumbnailUploadError: "Unable to upload thumbnail.",
			thumbnailAlt: "Thumbnail Alt Text",
			thumbnailAltPlaceholder:
				"Describe the thumbnail for accessibility and previews",
			bodyEyebrow: "Body",
			bodyTitle: "Write and review in one place",
			bodyDescription:
				"Write in markdown, upload inline images, and verify the final render before saving.",
			readTime: "Read time",
			taxonomyEyebrow: "Taxonomy",
			taxonomyTitle: "Place the article",
			mainTag: "Main tag",
			tags: "Tags",
			readinessEyebrow: "Readiness",
			readinessTitle: "Check the essentials",
			checklistTitleSet: "Title set",
			checklistThumbnailUploaded: "Thumbnail uploaded",
			checklistMainTagChosen: "Main tag chosen",
			checklistSupportingTagsAdded: "Supporting tags added",
			checklistDescriptionReady: "Description ready",
			checklistBodyHasSubstance: "Body has substance",
			ready: "Ready",
			missing: "Missing",
			wordCount: (count: number) => `${count} words`,
			tagCount: (count: number) =>
				`${count} tag${count === 1 ? "" : "s"} attached`,
			currentTarget: (status: string) => `Current target: ${status}`,
			currentLanguage: (language: string) => `Original language: ${language}`,
			publishEyebrow: "Publish",
			publishTitle: "Choose the next step",
			statusDraftLabel: "Save draft",
			statusDraftDescription:
				"Keep the post private while you shape the content.",
			statusPendingReviewLabel: "Send to review",
			statusPendingReviewDescription:
				"Mark the draft as ready for editorial review.",
			statusPublishedLabel: "Publish now",
			statusPublishedDescription:
				"Make the post visible on the site immediately.",
			saving: "Saving...",
			clearForm: "Clear form",
			submitError: "Unable to save the post right now. Please try again.",
			submitSuccessPublished: "Post published.",
			submitSuccessReview: "Post sent to review.",
			submitSuccessDraft: "Draft saved.",
			mainTagPlaceholder: "Pick an existing topic or define a new main tag",
			mainTagHelp:
				"Main tags group the post across listings and recommendations.",
			tagsPlaceholder: "Add tags and press Enter",
			tagsLimitReached: "Tag limit reached",
			tagSlotsLeft: (count: number) =>
				`${count} tag slots left. Use focused, searchable labels.`,
			editorControlsEyebrow: "Editor controls",
			editorControlsTitle: "Shape the markdown with intent",
			editorControlsDescription:
				"Inline images stay where you insert them and render centered in both preview and the final post.",
			modeWrite: "Write",
			modeWriteDescription: "Focus on the markdown.",
			modePreview: "Preview",
			modePreviewDescription: "Read the final render.",
			modeSplit: "Split",
			modeSplitDescription: "Write and preview together.",
			toolbarInline: "Inline",
			toolbarBlocks: "Blocks",
			toolbarBold: "Bold",
			toolbarItalic: "Italic",
			toolbarCode: "Code",
			toolbarLink: "Link",
			toolbarCodeBlock: "Code Block",
			toolbarHeading: "Heading",
			toolbarQuote: "Quote",
			toolbarList: "List",
			toolbarNumbered: "Numbered",
			toolbarDivider: "Divider",
			insertImage: "Insert image",
			dualPanel: "Dual panel",
			modeBadge: (mode: string) => `${mode} mode`,
			markdownEyebrow: "Markdown",
			markdownDescription:
				"Write with plain markdown and keep control of where every block and image lands.",
			editableSource: "Editable source",
			markdownPlaceholder:
				"Write the article in Markdown.\n\nExample:\n## Section title\n\nA paragraph with **emphasis** and a [link](https://example.com).\n",
			previewEyebrow: "Preview",
			previewDescription:
				"The preview uses the same renderer as the published post page.",
			finalRendering: "Final rendering",
			emptyPreview: "Start writing to see the final post rendering.",
			editorWordCount: (count: number) => `${count} words`,
			editorReadTime: (count: number) => `${count} min read`,
			editorCharacters: (used: number, max: number) =>
				`${used}/${max} characters`,
			imagesInserted: (count: number) =>
				`${count} ${count === 1 ? "image" : "images"} inserted into the markdown.`,
			imageDefaultAlt: "Image",
			imageUploadError: "Unable to upload image.",
			translationEyebrow: "Translations",
			translationTitle: "Add or update a localized version",
			translationDescription:
				"Translations override the title, description, thumbnail alt text, and body when a reader is browsing in that language. The slug, tags, and status stay tied to the original post.",
			translationOriginalLanguage: "Original post language",
			translationNoLocales:
				"All supported site languages are already covered by the original post or the saved translations.",
			translationLanguage: "Translation language",
			translationLanguageHelp:
				"Choose the site language that should receive this localized version.",
			translationExisting: "Available translations",
			translationNoneYet: "No translations saved yet.",
			translationStatusExisting: "Editing saved translation",
			translationStatusNew: "Creating new translation",
			translationCopyFromOriginal: "Copy original text",
			translationCopiedFromOriginal:
				"Original post content copied into the translation editor.",
			translationBodyDescription:
				"Write the translated markdown that should replace the original body for this language.",
			translationSave: "Save translation",
			translationSaving: "Saving translation...",
			translationSaveSuccess: "Translation saved.",
			translationSaveError:
				"Unable to save the translation right now. Please try again.",
			translationMustDiffer:
				"Choose a language different from the original post.",
			progressAria: (progress: number, remaining: number) =>
				`${progress}% progress, ${remaining} minutes remaining`,
		},
		postValidation: {
			localeRequired: "Post language is required.",
			imageRequired: "Image is required.",
			imageInvalid: "Image must be an uploaded file path or a valid URL.",
			tagEmpty: "Tags cannot be empty.",
			tagMaxLength: (max: number) => `Tags must be ${max} characters or fewer.`,
			titleMin: "Title must be at least 3 characters.",
			titleMax: (max: number) => `Title must be ${max} characters or fewer.`,
			slugMax: (max: number) => `Slug must be ${max} characters or fewer.`,
			slugInvalid:
				"Slug can only contain lowercase letters, numbers, and hyphens.",
			contentMin: "Content must be at least 30 characters.",
			contentMax: (max: number) =>
				`Content must be ${max} characters or fewer.`,
			thumbnailAltMax: (max: number) =>
				`Thumbnail alt text must be ${max} characters or fewer.`,
			mainTagRequired: "Main tag is required.",
			tagsRequired: "At least one tag is required.",
			tagsMaxItems: (max: number) => `Tags must contain ${max} items or fewer.`,
			tagsUnique: "Tags must be unique.",
			descriptionMax: (max: number) =>
				`Description must be ${max} characters or fewer.`,
		},
		post: {
			relatedReading: "Related reading",
			moreFromThisLane: "More from this lane",
			statusPublished: "Published",
			statusPendingReview: "Pending review",
			statusDraft: "Draft",
			translatedToCurrentLanguage: "Translated to your current language",
			translationFromLanguage: (language: string) =>
				`Originally written in ${language}`,
			writtenBy: "Written by",
			editPost: "Edit post",
			edit: "Edit",
			authorProfile: "Author profile",
			moreIn: (tag: string) => `More in ${tag}`,
			authorDescription: (
				name: string,
				mainTag: string,
				relatedTopics: string[],
			) =>
				relatedTopics.length > 0
					? `${name} writes around ${mainTag}, with recurring threads in ${relatedTopics.join(" and ")}.`
					: `${name} writes around ${mainTag}.`,
			commentSection: "Comment section",
			commentPlaceholder: "Add a comment",
			commentAs: (name: string) => `Commenting as ${name}`,
			loginRequiredToComment: "Login required to comment",
			comment: "Comment",
			postedOn: (date: string) => `Posted ${date}`,
			reportComment: "Report comment",
			loginModalTitle: "You need to be logged in to do this.",
			loginModalDescription:
				"Get a better experience when you sign in. Join the conversation.",
			reportCommentTitle: "Report comment",
			reportingCommentBy: (author: string) => `Reporting comment by ${author}:`,
			reason: "Reason",
			chooseReason: "Choose a reason...",
			details: "Details",
			detailsOptional: "Details (optional)",
			detailsMin: (min: number) => `Details (min ${min} chars)`,
			describeIssue: "Describe the issue...",
			addContext: "Add context (optional)...",
			submitReport: "Submit report",
			submitting: "Submitting...",
			reportValidation: "Please complete all required fields.",
		},
		authValidation: {
			emailRequired: "Email is required.",
			emailInvalid: "Enter a valid email address.",
			passwordTooLong: (max: number) =>
				`Password must be ${max} characters or fewer.`,
			passwordRequired: "Password is required.",
			passwordTooShort: "Password must be at least 8 characters.",
			nameTooShort: "Name must be at least 2 characters.",
			nameTooLong: "Name must be 60 characters or fewer.",
			confirmPasswordRequired: "Please confirm your password.",
			passwordsDoNotMatch: "Passwords do not match.",
			currentPasswordRequired: "Current password is required.",
			newPasswordRequired: "New password is required.",
			confirmNewPasswordRequired: "Please confirm your new password.",
		},
	},
	"pt-BR": {
		common: {
			home: "Início",
			recent: "Recentes",
			trending: "Em alta",
			tags: "Tags",
			about: "Sobre",
			playground: "Playground",
			profile: "Perfil",
			create: "Criar",
			suggest: "Sugerir",
			login: "Entrar",
			logout: "Sair",
			telegram: "Telegram",
			search: "Buscar",
			close: "Fechar",
			cancel: "Cancelar",
			results: "Resultados",
			page: "Página",
			views: "Visualizações",
			bookmarks: "Favoritos",
			comments: "Comentários",
			author: "Autor",
			edited: "Editado",
			published: "Publicado",
			lastSaved: "Último salvamento",
			readTime: "Tempo de leitura",
			minutesShort: "min",
			previous: "Anterior",
			next: "Próxima",
			loadingProfile: "Carregando perfil",
			preparingPage: "Preparando a página",
			noItemsYet: "Ainda não há itens para mostrar.",
			noDescriptionYet: "Ainda não há descrição de perfil.",
			percentComplete: (progress: number) => `${progress}% concluído`,
		},
		language: {
			label: "Idioma",
			ariaLabel: "Mudar o idioma do site",
			menuTitle: "Escolher idioma",
		},
		header: {
			eyebrow: "Blog pessoal de desenvolvimento",
			description:
				"Tutoriais, opiniões, notas de frontend e projetos interativos reunidos em um só lugar.",
			suggestTitle: "Sugerir um post (requer revisão)",
			homeAria: "Início",
		},
		nav: {
			navigation: "Navegação",
			openMenu: "Abrir menu de navegação",
			closeMenu: "Fechar menu de navegação",
		},
		footer: {
			title: "Posts, experimentos e trabalho de interface.",
			description:
				"Um blog pessoal de desenvolvimento com textos, estudos de interação e um playground para ideias que são mais fáceis de mostrar do que descrever.",
			navigate: "Navegar",
			socials: "Redes",
			closing: "Artigos, experimentos de UI e trabalhos interativos paralelos.",
		},
		popover: {
			aria: "Ações do post",
			save: "Salvar nos favoritos",
			share: "Compartilhar",
			moreLikeThis: "Mais posts como este",
			lessLikeThis: "Menos posts como este",
		},
		home: {
			startHere: "Comece por aqui",
			title: "Um blog pessoal de desenvolvimento com espaço para explorar",
			description:
				"O DevBlog é onde eu publico textos sobre desenvolvimento, opiniões, tutoriais e experimentos. A página inicial destaca leituras em evidência, o que está em alta agora e atalhos para explorar o restante do blog.",
			featuredPosts: "Posts em destaque",
			trendingPicks: "Destaques em alta",
			recommended: "Recomendados",
			trendingSnapshot: "Panorama do momento",
			trendingTitle: "O que está recebendo atenção agora",
			trendingDescription:
				"Uma leitura rápida dos posts que estão atraindo leitores no momento, mantidos no mesmo lugar de antes, mas com uma estrutura de seção mais clara.",
			exploreFurther: "Explore mais",
			exploreTitle: "Mais caminhos para entrar no blog",
			exploreDescription:
				"Use estas seções para alternar entre o que é novo, o que está em alta e os posts que valem uma revisita.",
			editorPicks: "Escolhas do editor",
			noRecommended:
				"Ainda não há posts recomendados. Publique algumas entradas e esta seção será preenchida automaticamente pelo banco de dados ativo.",
			noPosts:
				"Ainda não há posts publicados. A página inicial já está conectada ao Prisma, então as seções serão preenchidas assim que existirem posts reais.",
			scrollToTrending: "Ir para os posts em alta",
			noTrending:
				"Ainda não há posts em alta. Quando os posts publicados começarem a acumular visualizações, eles aparecerão aqui automaticamente.",
			explore: "Explorar",
			trendingPosts: "Posts em alta",
			trendingPostsDescription: "Veja o que está chamando mais atenção agora.",
			recentPosts: "Posts recentes",
			recentPostsDescription:
				"Comece pelos textos mais novos e volte a partir deles.",
			browseByTag: "Explorar por tag",
			browseByTagDescription:
				"Filtre o catálogo de posts ao vivo por assunto e tags de apoio.",
			noSectionPost: "Ainda não há post disponível para esta seção.",
			noRecommendedCallouts:
				"Os destaques recomendados aparecerão aqui depois que mais posts forem publicados.",
			viewSection: "Ver seção",
		},
		notFound: {
			description: "A página que você está procurando não foi encontrada.",
			backHome: "Voltar para a página inicial",
		},
		searchBar: {
			placeholder: "Buscar posts",
			ariaLabel: "Buscar posts",
			openSearch: "Abrir busca",
			searchSuggestions: "Sugestões de busca",
			viewAllResults: "Ver todos os resultados",
		},
		suggestModal: {
			title: "Sugerir um post",
			close: "Fechar modal de sugestão",
			fieldTitle: "Título",
			titlePlaceholder: "ex.: Entendendo React Server Components no Next 14",
			fieldIdea: "Qual é a ideia?",
			ideaPlaceholder:
				"Adicione um pequeno esboço, tópicos ou links para contexto (opcional).",
			reviewNote:
				"Sua sugestão será revisada antes da publicação. Evite dados sensíveis ou informações pessoais.",
			submitted: "Enviado!",
			submitting: "Enviando...",
			submit: "Enviar sugestão",
			titleTooShort: (min: number) =>
				`O título deve ter pelo menos ${min} caracteres.`,
			maxChars: (max: number) => `Máximo de ${max} caracteres.`,
		},
		about: {
			eyebrow: "Sobre o devblog",
			title: "Um lugar para escrever, experimentar e continuar publicando",
			description:
				"Este site é onde textos, trabalho de interface e experimentos paralelos compartilham a mesma moldura. A ideia é permanecer útil, pessoal e ativo, em vez de virar um portfólio estático.",
			storyCards: [
				{
					label: "Por que ele existe",
					title: "Um blog que eu realmente continuo usando",
					text: "O DevBlog é o meu blog pessoal de desenvolvimento de software. É onde publico tutoriais, opiniões, experimentos, ideias de interface e as partes do desenvolvimento web que mais gosto de lapidar.",
				},
				{
					label: "Como ele é construído",
					title: "Uma stack prática com espaço para trabalho visual",
					text: "A stack gira em torno de Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser e algumas bibliotecas de apoio para organização de dados e experimentos. O objetivo é manter o projeto prático, simples e agradável de construir sem perder o lado visual do trabalho.",
				},
				{
					label: "O que mais vive aqui",
					title: "Ferramentas leves, esboços e ideias paralelas",
					text: "Além dos posts, o site aposta na interatividade: descoberta por tags, recomendações, ferramentas para usuários e um playground cheio de jogos e esboços. Eu não sou desenvolvedor de jogos, mas o playground é uma boa casa para projetos de hobby e outra forma de mostrar o que consigo construir.",
				},
			],
		},
		playgroundPage: {
			title: "Jogos, esboços e desvios jogáveis",
			description:
				"Esta página é uma casa para experimentos de hobby. Eu sou principalmente um desenvolvedor web, não um desenvolvedor de jogos, mas esses pequenos projetos são uma forma útil de explorar interação, movimento e ideias de renderização no navegador.",
			totalProjects: "Total de projetos",
			projects: "Projetos",
			playableTitle: "Jogáveis",
			playableDescription:
				"Experimentos práticos que você pode controlar diretamente, de jogos a pequenos sistemas.",
			watchOnlyTitle: "Só para assistir",
			watchOnlyDescription:
				"Peças visuais que funcionam melhor como estudos de movimento do que como jogos com pontuação.",
			mode: "Modo",
			loading: "Carregando...",
			closeGame: "Fechar jogo",
			mobileNoticeTitle: "Playground pensado para desktop",
			mobileNoticeBody:
				"Esses projetos foram pensados primeiro para telas maiores. Você ainda pode explorar por aqui, mas um computador costuma oferecer o layout e os controles pretendidos.",
			badges: {
				playable: "Jogável",
				watchOnly: "Só assistir",
			},
			games: {
				chess: { name: "Chess", description: "Jogo de xadrez clássico" },
				snakeGame: {
					name: "Snake Game",
					description: "Jogo da cobrinha clássico",
				},
				minesweeper: {
					name: "Minesweeper",
					description: "Campo minado",
				},
				antSimulator: {
					name: "Ant Simulator",
					description: "Corrida de colônias de formigas",
				},
				solarSystem: {
					name: "Solar System",
					description: "Dança planetária",
				},
				terminal: { name: "Terminal", description: "Terminal Linux" },
				tankShooter: {
					name: "Tank Shooter",
					description: "Jogo de tanques",
				},
				fallingSand: {
					name: "Falling Sand",
					description: "Areia caindo",
				},
				movingMountains: {
					name: "Moving Mountains",
					description: "Montanhas em movimento",
				},
				survivalShooter: {
					name: "Survival Shooter",
					description: "Tiro de sobrevivência",
				},
				tetris: { name: "Tetris", description: "Tetris" },
				binaryPong: {
					name: "Binary Pong",
					description: "Pong binário",
				},
				sineWaves: {
					name: "Sine Waves",
					description: "Ondas senoidais",
				},
				voronoiWall: {
					name: "Voronoi Wall",
					description: "Parede de Voronoi",
				},
				"2048": { name: "2048", description: "2048" },
				pacman: { name: "Pacman", description: "Pacman" },
				newtonCannon: {
					name: "Newton Cannon",
					description: "Canhão de Newton",
				},
				flappyBird: {
					name: "Flappy Bird",
					description: "Flappy Bird",
				},
				labyrinthExplorer: {
					name: "Labyrinth Explorer",
					description: "Explorador de labirintos",
				},
			},
		},
		recent: {
			eyebrow: "Posts mais recentes",
			title: "Os posts mais novos, em ordem",
			description:
				"Esta página é a visão mais clara do blog em ordem de publicação. Ela mantém os textos mais novos em primeiro plano, com paginação e pistas de assunto por perto quando você quiser continuar navegando.",
			postCount: "Quantidade de posts",
			currentPage: "Página atual",
			totalViews: "Total de visualizações",
			latestArrival: "Última chegada",
			noPublished:
				"Ainda não há posts publicados. Crie o seu primeiro post e ele aparecerá aqui como a entrada mais recente.",
			readingGuide: "Guia de leitura",
			stayOriented: "Mantenha-se orientado",
			stayOrientedDescription:
				"Percorra o blog página por página, acompanhe a entrada mais recente e salte para os tópicos que aparecem com mais frequência no lote mais novo de posts.",
			showingNow: "Exibindo agora",
			pageControls: "Controles de página",
			freshTopics: "Tópicos recentes",
			topicCountsLater:
				"As contagens de tópicos aparecerão aqui depois que os posts forem publicados.",
			recentPosts: "Posts recentes",
			recentPostsTitle: "Entradas mais novas do devblog",
			recentPostsDescription:
				"Ordenados estritamente por data de publicação para que a página se comporte como um feed realmente recente, e não uma mistura aleatória.",
			noPosts:
				"Ainda não há posts disponíveis. Esta página agora lê diretamente do banco de dados e será preenchida assim que existirem entradas publicadas.",
			noPublishedShort: "Ainda não há posts publicados",
			relatedTags: (count: number) =>
				`${count} ${count === 1 ? "tag relacionada" : "tags relacionadas"}`,
			visibleRange: (start: number, end: number, total: number) =>
				`Posts ${start}-${end} de ${total}`,
			pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
		},
		trending: {
			eyebrow: "Em alta agora",
			title: "O que os leitores estão acompanhando",
			description:
				"O acordeão continua sendo a assinatura da página, mas agora o restante da tela o acompanha: posts ranqueados, sinais visíveis de tópicos e razões mais claras para um post estar no topo.",
			trackedPosts: "Posts rastreados",
			topPost: "Top post",
			totalViews: "Total de visualizações",
			noTrending:
				"Ainda não há posts em alta disponíveis. Esta seção será preenchida quando os posts publicados começarem a acumular visualizações.",
			trendSignals: "Sinais de tendência",
			topicRadar: "Radar de tópicos",
			topicRadarDescription:
				"Tópicos principais com presença mais forte na seleção atual de tendências. Use-os para chegar a posts relacionados sem perder o contexto do que está aquecido agora.",
			topicSignalsLater:
				"Os sinais de tópicos aparecerão aqui depois que os posts forem publicados.",
			leadingPost: "Post líder",
			leadingPostEmpty:
				"Ainda não existe um líder em alta. Publique posts e acumule visualizações para construir esse ranking.",
			ranking: "Ranking",
			topMomentum: "Top posts por impulso",
			topMomentumDescription:
				"Os posts mais lidos agora, ordenados por visualizações para que a lista reflita uma tendência real em vez de uma amostra aleatória.",
			moreToWatch: "Mais para acompanhar",
			risingPosts: "Posts em ascensão",
			risingPostsDescription:
				"Posts logo abaixo do topo que ainda merecem uma apresentação clara e legível, em vez de mais uma lista densa.",
			notEnoughPosts:
				"Ainda não há posts suficientes para uma segunda seleção em destaque.",
			readPost: "Ler post",
			focusPost: (title: string) => `Focar em ${title}`,
			viewsSuffix: (count: string) => `${count} visualizações`,
		},
		search: {
			eyebrow: "Buscar posts",
			description:
				"Navegue pelos posts correspondentes em todo o devblog. Os resultados usam os mesmos cards de posts do restante do site, com paginação quando a busca ocupa mais de uma tela.",
			matches: "Correspondências",
			noMatch: "Sem resultado",
			nothingFound: (query: string) => `Nada apareceu para "${query}".`,
			noMatchDescription:
				"Tente uma busca mais curta, procure por tag ou autor, ou volte para os posts mais recentes para continuar navegando.",
			seeRecentPosts: "Ver posts recentes",
			resultsFor: (query: string) => `Resultados para "${query}"`,
		},
		tag: {
			eyebrow: "Explorar por tag",
			title: "Descubra posts por assunto",
			description:
				"Use tags para afunilar o blog rapidamente. Escolha um tópico principal, some algumas tags de apoio e mantenha a grade de resultados visível enquanto refina.",
			totalTags: "Total de tags",
			selected: "Selecionadas",
			visiblePosts: "Posts visíveis",
			mainTopics: "Tópicos principais",
			mainTopicsDescription: "As categorias amplas que moldam cada post.",
			supportingTags: "Tags de apoio",
			supportingTagsDescription:
				"Use estas para afunilar a grade sem perder contexto.",
			noPostsYet: "Ainda não há posts",
			unlockAfterFirstPost:
				"A navegação por tags será liberada depois do primeiro post publicado",
			tagBrowsingDescription:
				"A página de tags agora lê o banco de dados real, então continuará vazia até existirem posts publicados e tags para exibir.",
			noMatches: "Sem resultados",
			noPostsFit: "Nenhum post combina com esta seleção",
			noPostsFitDescription:
				"Tente remover uma das tags ativas ou mudar para um tópico principal mais amplo. As escolhas rápidas do painel de filtro são um bom ponto de reinício.",
			viewsSuffix: (count: string) => `${count} visualizações`,
			filterPosts: "Filtrar posts",
			findTopic: "Encontre um tópico",
			filterDescription: (max: number) =>
				`Pesquise tags, combine até ${max} e afunile a grade de posts sem sair da página.`,
			searchTags: "Buscar tags",
			selectedTags: "Tags selecionadas",
			selectedTagsHint:
				"Adicione outra tag para refinar ainda mais, ou redefina para ampliar os resultados.",
			selectedTagsEmpty:
				"Comece com um tópico amplo e depois some tags de apoio se precisar focar os resultados.",
			clearFilters: "Limpar filtros",
			quickPicks: "Escolhas rápidas",
			quickPicksDescription: "Tags populares que abrem a página rapidamente.",
			tagGroupMainDescription: "Categorias principais que definem o post.",
			tagGroupOtherDescription: "Detalhes secundários e assuntos relacionados.",
			noTagsMatch: "Nenhuma tag corresponde à busca atual.",
			resultsSummary: (resultsCount: number, tagCount: number) =>
				`${resultsCount} ${resultsCount === 1 ? "post" : "posts"} correspondendo a ${tagCount} ${tagCount === 1 ? "tag" : "tags"}`,
			showingAll: (resultsCount: number) =>
				`Mostrando todos os ${resultsCount} ${resultsCount === 1 ? "posts" : "posts"}`,
			resultsDescription:
				"Remova uma tag para ampliar os resultados ou continue combinando tópicos relacionados para manter o foco.",
			resultsDescriptionEmpty:
				"Use as escolhas rápidas, as faixas em movimento ou o painel de filtros para entrar em um tema específico.",
			resetAll: "Redefinir tudo",
			removeTag: (label: string) => `Remover ${label}`,
			noActiveFilters: "Não há filtros de tags ativos.",
		},
		login: {
			eyebrow: "Acesso de membro",
			title: "Entrar",
			email: "E-mail",
			password: "Senha",
			hidePassword: "Ocultar senha",
			showPassword: "Mostrar senha",
			continue: "Continuar",
			noAccount: "Ainda não tem uma conta?",
			register: "Registrar",
			invalidCredentials: "Email ou senha inválidos.",
			unableToLogin: "Não foi possível entrar agora.",
		},
		register: {
			eyebrow: "Criar acesso",
			title: "Registrar",
			name: "Nome",
			email: "E-mail",
			password: "Senha",
			confirmPassword: "Confirmar senha",
			hidePassword: "Ocultar senha",
			showPassword: "Mostrar senha",
			createAccount: "Criar conta",
			haveAccount: "Já tem uma conta?",
			login: "Entrar",
			unableToCreate: "Não foi possível criar a conta agora.",
			accountCreatedLoginFailed: "Conta criada, mas o login automático falhou.",
			unableToCreateShort: "Não foi possível criar a conta.",
		},
		profile: {
			overview: "Visão geral do perfil",
			yourProfile: "Seu perfil",
			description:
				"Os dados reais da conta agora vêm do banco de dados, incluindo papel, provedores conectados, campos persistidos do perfil e contagens de atividade ao vivo.",
			loadingTitle: "Preparando a página",
			unavailable: "Perfil indisponível",
			goToLogin: "Ir para o login",
			bookmarks: "Favoritos",
			viewedPosts: "Posts vistos",
			comments: "Comentários",
			handle: "Usuário",
			email: "E-mail",
			role: "Função",
			passwordLogin: "Login por senha",
			configured: "Configurado",
			notSet: "Não definido",
			connectedAccounts: "Contas conectadas",
			credentialsOnly: "Apenas credenciais",
			editProfile: "Editar perfil",
			logout: "Sair",
			profileAlt: (name: string) => `Perfil de ${name}`,
			recentActivity: "Atividade recente em todo o blog",
			noCommentsYet: "Ainda não há comentários para mostrar.",
			editedOn: (date: string) => `Editado em ${date}`,
			itemCount: (count: number) =>
				`${count} ${count === 1 ? "item" : "itens"}`,
			loadLoginRequired: "Faça login para acessar seu perfil.",
			loadNotFound: "Este perfil não pôde ser encontrado.",
			loadError: "Não foi possível carregar este perfil agora.",
			saveError: "Não foi possível salvar o perfil.",
		},
		profileEdit: {
			settingsEyebrow: "Configurações do perfil",
			title: "Editar perfil",
			closeModal: "Fechar modal de edição de perfil",
			preview: "Prévia",
			previewAlt: "Prévia do perfil",
			providerAvailable: "Foto do provedor disponível",
			providerMissing: "Nenhuma foto do provedor cadastrada",
			providerPhoto: "Foto do provedor",
			generatedAvatar: "Avatar gerado",
			uploadPhoto: "Enviar foto",
			uploadHint: "JPG, PNG ou WEBP com até 2MB.",
			uploadedImageLabel: "Imagem enviada",
			uploaded: (name: string) => `Enviado: ${name}`,
			displayName: "Nome de exibição",
			profileUrl: (handle: string) => `URL do perfil: \`/profile/${handle}\``,
			description: "Descrição",
			changePassword: "Alterar senha",
			createPassword: "Criar senha",
			changePasswordDescription:
				"Atualize a senha de login por email sem perder o acesso social.",
			createPasswordDescription:
				"Adicione uma senha de login por email a esta conta social.",
			optional: "Opcional",
			currentPassword: "Senha atual",
			newPassword: "Nova senha",
			confirmNewPassword: "Confirmar nova senha",
			save: "Salvar perfil",
			saving: "Salvando...",
		},
		profileValidation: {
			nameRequired: "Nome é obrigatório.",
			maxChars: (max: number) => `Máximo de ${max} caracteres.`,
			handleRequired: "Usuário é obrigatório.",
			handleLettersNumbersOnly: "Use apenas letras e números.",
			handleMin: (min: number) =>
				`O usuário deve ter pelo menos ${min} caracteres.`,
			handleMax: (max: number) =>
				`O usuário deve ter ${max} caracteres ou menos.`,
			uploadRequired: "Envie uma imagem JPG, PNG ou WEBP.",
			uploadAllowed: "Somente imagens JPG, PNG ou WEBP são permitidas.",
			uploadMaxSize: "O tamanho máximo da imagem é 2MB.",
			invalidProviderUrl: (provider: string) =>
				`URL inválida para ${provider}.`,
			currentPasswordIncorrect: "A senha atual está incorreta.",
			handleTaken: "Esse usuário já está em uso.",
			unableToSave: "Não foi possível salvar o perfil.",
		},
		newPost: {
			createPageEyebrow: "Novo post",
			createPageTitle: "Crie um artigo pronto para produção",
			createPageDescription:
				"Escreva o markdown real, anexe mídias reais e salve direto no backend para que a página do post renderize exatamente o mesmo conteúdo.",
			accessRequiredTitle: "Acesso de autor obrigatório",
			accessRequiredDescription:
				"Esta página é reservada para contas de colaboradores. Entre com um perfil com permissão de escrita para rascunhar, revisar e publicar posts.",
			editPageEyebrow: "Editar post",
			editPageTitle: "Atualizar artigo",
			editPageDescription:
				"Refine os metadados, o corpo ou a mídia e salve de volta no mesmo registro persistido do post.",
			editAccessDeniedTitle: "Acesso negado",
			editAccessDeniedDescription:
				"Apenas o autor ou administradores do site podem editar este post.",
			role: "Função",
			author: "Autor",
			defaultAuthor: "Autor",
			language: "Idioma original",
			languageHelp:
				"Este é o idioma em que o post foi escrito primeiro. As traduções são anexadas separadamente na página de edição.",
			mode: "Modo",
			modeCreating: "Criando",
			modeEditing: "Editando",
			editorEyebrowCreate: "Novo post",
			editorEyebrowEdit: "Editar post",
			editorTitleCreate: "Monte o post antes de publicá-lo",
			editorTitleEdit: "Refine a versão publicada",
			editorDescription:
				"O editor persiste markdown real, caminhos reais de mídia e metadados reais do post no Prisma. O que você vê aqui é o que será renderizado na página do post.",
			storySetupEyebrow: "Estrutura da história",
			storySetupTitle: "Defina primeiro os metadados",
			title: "Título",
			titlePlaceholder: "Um título que mereça o clique",
			slug: "Slug",
			slugPlaceholder: "slug-da-url-do-post",
			regenerate: "Gerar novamente",
			finalUrl: (slug: string) => `URL final: /post/${slug}`,
			description: "Descrição",
			generateFromContent: "Gerar a partir do conteúdo",
			descriptionPlaceholder:
				"O que o leitor deve entender antes de abrir o artigo?",
			visualsEyebrow: "Visual",
			visualsTitle: "Defina a miniatura do post",
			thumbnail: "Miniatura",
			thumbnailDescription:
				"Ela define a imagem principal da página do post e a miniatura dos cards em todo o restante do site.",
			upload: "Enviar",
			uploading: "Enviando...",
			thumbnailPreviewAlt: "Miniatura do post",
			thumbnailEmpty: "Envie a imagem que deve representar o post.",
			thumbnailUploaded: "Miniatura enviada.",
			thumbnailUploadError: "Não foi possível enviar a miniatura.",
			thumbnailAlt: "Texto alternativo da miniatura",
			thumbnailAltPlaceholder:
				"Descreva a miniatura para acessibilidade e prévias",
			bodyEyebrow: "Corpo",
			bodyTitle: "Escreva e revise no mesmo lugar",
			bodyDescription:
				"Escreva em markdown, envie imagens embutidas e verifique a renderização final antes de salvar.",
			readTime: "Tempo de leitura",
			taxonomyEyebrow: "Taxonomia",
			taxonomyTitle: "Posicione o artigo",
			mainTag: "Tag principal",
			tags: "Tags",
			readinessEyebrow: "Prontidão",
			readinessTitle: "Verifique o essencial",
			checklistTitleSet: "Título definido",
			checklistThumbnailUploaded: "Miniatura enviada",
			checklistMainTagChosen: "Tag principal escolhida",
			checklistSupportingTagsAdded: "Tags de apoio adicionadas",
			checklistDescriptionReady: "Descrição pronta",
			checklistBodyHasSubstance: "Corpo com substância",
			ready: "Pronto",
			missing: "Faltando",
			wordCount: (count: number) => `${count} palavras`,
			tagCount: (count: number) =>
				`${count} tag${count === 1 ? "" : "s"} anexada${count === 1 ? "" : "s"}`,
			currentTarget: (status: string) => `Destino atual: ${status}`,
			currentLanguage: (language: string) => `Idioma original: ${language}`,
			publishEyebrow: "Publicar",
			publishTitle: "Escolha o próximo passo",
			statusDraftLabel: "Salvar rascunho",
			statusDraftDescription:
				"Mantenha o post privado enquanto você molda o conteúdo.",
			statusPendingReviewLabel: "Enviar para revisão",
			statusPendingReviewDescription:
				"Marque o rascunho como pronto para revisão editorial.",
			statusPublishedLabel: "Publicar agora",
			statusPublishedDescription: "Torne o post visível no site imediatamente.",
			saving: "Salvando...",
			clearForm: "Limpar formulário",
			submitError: "Não foi possível salvar o post agora. Tente novamente.",
			submitSuccessPublished: "Post publicado.",
			submitSuccessReview: "Post enviado para revisão.",
			submitSuccessDraft: "Rascunho salvo.",
			mainTagPlaceholder:
				"Escolha um tópico existente ou defina uma nova tag principal",
			mainTagHelp:
				"As tags principais agrupam o post em listagens e recomendações.",
			tagsPlaceholder: "Adicione tags e pressione Enter",
			tagsLimitReached: "Limite de tags atingido",
			tagSlotsLeft: (count: number) =>
				`Restam ${count} espaços para tags. Use rótulos focados e fáceis de buscar.`,
			editorControlsEyebrow: "Controles do editor",
			editorControlsTitle: "Molde o markdown com intenção",
			editorControlsDescription:
				"As imagens embutidas permanecem onde você as insere e são renderizadas centralizadas tanto na prévia quanto no post final.",
			modeWrite: "Escrever",
			modeWriteDescription: "Foque no markdown.",
			modePreview: "Prévia",
			modePreviewDescription: "Leia a renderização final.",
			modeSplit: "Dividido",
			modeSplitDescription: "Escreva e visualize juntos.",
			toolbarInline: "Inline",
			toolbarBlocks: "Blocos",
			toolbarBold: "Negrito",
			toolbarItalic: "Itálico",
			toolbarCode: "Código",
			toolbarLink: "Link",
			toolbarCodeBlock: "Bloco de código",
			toolbarHeading: "Título",
			toolbarQuote: "Citação",
			toolbarList: "Lista",
			toolbarNumbered: "Numerada",
			toolbarDivider: "Divisor",
			insertImage: "Inserir imagem",
			dualPanel: "Painel duplo",
			modeBadge: (mode: string) => `Modo ${mode}`,
			markdownEyebrow: "Markdown",
			markdownDescription:
				"Escreva com markdown puro e mantenha controle sobre onde cada bloco e imagem aparecem.",
			editableSource: "Fonte editável",
			markdownPlaceholder:
				"Escreva o artigo em Markdown.\n\nExemplo:\n## Título da seção\n\nUm parágrafo com **ênfase** e um [link](https://example.com).\n",
			previewEyebrow: "Prévia",
			previewDescription:
				"A prévia usa o mesmo renderizador da página publicada do post.",
			finalRendering: "Renderização final",
			emptyPreview: "Comece a escrever para ver a renderização final do post.",
			editorWordCount: (count: number) => `${count} palavras`,
			editorReadTime: (count: number) => `${count} min de leitura`,
			editorCharacters: (used: number, max: number) =>
				`${used}/${max} caracteres`,
			imagesInserted: (count: number) =>
				`${count} ${count === 1 ? "imagem inserida" : "imagens inseridas"} no markdown.`,
			imageDefaultAlt: "Imagem",
			imageUploadError: "Não foi possível enviar a imagem.",
			translationEyebrow: "Traduções",
			translationTitle: "Adicionar ou atualizar uma versão localizada",
			translationDescription:
				"As traduções substituem o título, a descrição, o texto alternativo da miniatura e o corpo quando o leitor estiver navegando nesse idioma. O slug, as tags e o status continuam ligados ao post original.",
			translationOriginalLanguage: "Idioma do post original",
			translationNoLocales:
				"Todos os idiomas suportados já estão cobertos pelo post original ou pelas traduções salvas.",
			translationLanguage: "Idioma da tradução",
			translationLanguageHelp:
				"Escolha o idioma do site que deve receber esta versão localizada.",
			translationExisting: "Traduções disponíveis",
			translationNoneYet: "Ainda não há traduções salvas.",
			translationStatusExisting: "Editando tradução salva",
			translationStatusNew: "Criando nova tradução",
			translationCopyFromOriginal: "Copiar texto original",
			translationCopiedFromOriginal:
				"O conteúdo do post original foi copiado para o editor de tradução.",
			translationBodyDescription:
				"Escreva o markdown traduzido que deve substituir o corpo original neste idioma.",
			translationSave: "Salvar tradução",
			translationSaving: "Salvando tradução...",
			translationSaveSuccess: "Tradução salva.",
			translationSaveError:
				"Não foi possível salvar a tradução agora. Tente novamente.",
			translationMustDiffer:
				"Escolha um idioma diferente do post original.",
			progressAria: (progress: number, remaining: number) =>
				`${progress}% de progresso, ${remaining} minutos restantes`,
		},
		postValidation: {
			localeRequired: "O idioma do post é obrigatório.",
			imageRequired: "A imagem é obrigatória.",
			imageInvalid:
				"A imagem deve ser um caminho de arquivo enviado ou uma URL válida.",
			tagEmpty: "As tags não podem ficar vazias.",
			tagMaxLength: (max: number) =>
				`As tags devem ter ${max} caracteres ou menos.`,
			titleMin: "O título deve ter pelo menos 3 caracteres.",
			titleMax: (max: number) =>
				`O título deve ter ${max} caracteres ou menos.`,
			slugMax: (max: number) => `O slug deve ter ${max} caracteres ou menos.`,
			slugInvalid: "O slug só pode conter letras minúsculas, números e hífens.",
			contentMin: "O conteúdo deve ter pelo menos 30 caracteres.",
			contentMax: (max: number) =>
				`O conteúdo deve ter ${max} caracteres ou menos.`,
			thumbnailAltMax: (max: number) =>
				`O texto alternativo da miniatura deve ter ${max} caracteres ou menos.`,
			mainTagRequired: "A tag principal é obrigatória.",
			tagsRequired: "Pelo menos uma tag é obrigatória.",
			tagsMaxItems: (max: number) =>
				`As tags devem conter ${max} itens ou menos.`,
			tagsUnique: "As tags devem ser únicas.",
			descriptionMax: (max: number) =>
				`A descrição deve ter ${max} caracteres ou menos.`,
		},
		post: {
			relatedReading: "Leitura relacionada",
			moreFromThisLane: "Mais desta linha",
			statusPublished: "Publicado",
			statusPendingReview: "Aguardando revisão",
			statusDraft: "Rascunho",
			translatedToCurrentLanguage: "Traduzido para o seu idioma atual",
			translationFromLanguage: (language: string) =>
				`Escrito originalmente em ${language}`,
			writtenBy: "Escrito por",
			editPost: "Editar post",
			edit: "Editar",
			authorProfile: "Perfil do autor",
			moreIn: (tag: string) => `Mais em ${tag}`,
			authorDescription: (
				name: string,
				mainTag: string,
				relatedTopics: string[],
			) =>
				relatedTopics.length > 0
					? `${name} escreve sobre ${mainTag}, com recorrência em ${relatedTopics.join(" e ")}.`
					: `${name} escreve sobre ${mainTag}.`,
			commentSection: "Seção de comentários",
			commentPlaceholder: "Adicione um comentário",
			commentAs: (name: string) => `Comentando como ${name}`,
			loginRequiredToComment: "Faça login para comentar",
			comment: "Comentar",
			postedOn: (date: string) => `Publicado em ${date}`,
			reportComment: "Reportar comentário",
			loginModalTitle: "Você precisa estar logado para fazer isso.",
			loginModalDescription:
				"Tenha uma experiência melhor ao entrar. Participe da conversa.",
			reportCommentTitle: "Reportar comentário",
			reportingCommentBy: (author: string) =>
				`Reportando comentário de ${author}:`,
			reason: "Motivo",
			chooseReason: "Escolha um motivo...",
			details: "Detalhes",
			detailsOptional: "Detalhes (opcional)",
			detailsMin: (min: number) => `Detalhes (mín. ${min} caracteres)`,
			describeIssue: "Descreva o problema...",
			addContext: "Adicione contexto (opcional)...",
			submitReport: "Enviar denúncia",
			submitting: "Enviando...",
			reportValidation: "Preencha todos os campos obrigatórios.",
		},
		authValidation: {
			emailRequired: "Email é obrigatório.",
			emailInvalid: "Digite um endereço de email válido.",
			passwordTooLong: (max: number) =>
				`A senha deve ter ${max} caracteres ou menos.`,
			passwordRequired: "Senha é obrigatória.",
			passwordTooShort: "A senha deve ter pelo menos 8 caracteres.",
			nameTooShort: "O nome deve ter pelo menos 2 caracteres.",
			nameTooLong: "O nome deve ter 60 caracteres ou menos.",
			confirmPasswordRequired: "Confirme sua senha.",
			passwordsDoNotMatch: "As senhas não coincidem.",
			currentPasswordRequired: "A senha atual é obrigatória.",
			newPasswordRequired: "A nova senha é obrigatória.",
			confirmNewPasswordRequired: "Confirme sua nova senha.",
		},
	},
	es: {
		common: {
			home: "Inicio",
			recent: "Recientes",
			trending: "Tendencias",
			tags: "Tags",
			about: "Acerca de",
			playground: "Playground",
			profile: "Perfil",
			create: "Crear",
			suggest: "Sugerir",
			login: "Entrar",
			logout: "Salir",
			telegram: "Telegram",
			search: "Buscar",
			close: "Cerrar",
			cancel: "Cancelar",
			results: "Resultados",
			page: "Página",
			views: "Vistas",
			bookmarks: "Guardados",
			comments: "Comentarios",
			author: "Autor",
			edited: "Editado",
			published: "Publicado",
			lastSaved: "Último guardado",
			readTime: "Tiempo de lectura",
			minutesShort: "min",
			previous: "Anterior",
			next: "Siguiente",
			loadingProfile: "Cargando perfil",
			preparingPage: "Preparando la página",
			noItemsYet: "Todavía no hay elementos para mostrar.",
			noDescriptionYet: "Todavía no hay descripción del perfil.",
			percentComplete: (progress: number) => `${progress}% completado`,
		},
		language: {
			label: "Idioma",
			ariaLabel: "Cambiar el idioma del sitio",
			menuTitle: "Elegir idioma",
		},
		header: {
			eyebrow: "Blog personal de desarrollo",
			description:
				"Tutoriales, opiniones, notas de frontend y proyectos interactivos reunidos en un solo lugar.",
			suggestTitle: "Sugerir una publicación (requiere revisión)",
			homeAria: "Inicio",
		},
		nav: {
			navigation: "Navegación",
			openMenu: "Abrir menú de navegación",
			closeMenu: "Cerrar menú de navegación",
		},
		footer: {
			title: "Publicaciones, experimentos y trabajo de interfaz.",
			description:
				"Un blog personal de desarrollo con textos, estudios de interacción y un playground para ideas que son más fáciles de mostrar que de describir.",
			navigate: "Navegar",
			socials: "Redes",
			closing: "Artículos, experimentos de UI y trabajo interactivo paralelo.",
		},
		popover: {
			aria: "Acciones de la publicación",
			save: "Guardar en marcadores",
			share: "Compartir",
			moreLikeThis: "Más publicaciones como esta",
			lessLikeThis: "Menos publicaciones como esta",
		},
		home: {
			startHere: "Empieza aquí",
			title: "Un blog personal de desarrollo con espacio para explorar",
			description:
				"DevBlog es donde publico textos sobre desarrollo, opiniones, tutoriales y experimentos. La portada destaca lecturas principales, lo que está en tendencia ahora y accesos rápidos para explorar el resto del blog.",
			featuredPosts: "Publicaciones destacadas",
			trendingPicks: "Selecciones en tendencia",
			recommended: "Recomendados",
			trendingSnapshot: "Resumen de tendencias",
			trendingTitle: "Lo que está recibiendo atención ahora",
			trendingDescription:
				"Una lectura rápida de las publicaciones que están atrayendo lectores ahora mismo, en el mismo lugar de antes pero con una estructura de sección más clara.",
			exploreFurther: "Sigue explorando",
			exploreTitle: "Más formas de entrar al blog",
			exploreDescription:
				"Usa estas secciones para moverte entre lo nuevo, lo que recibe atención y las publicaciones que vale la pena revisitar.",
			editorPicks: "Selecciones del editor",
			noRecommended:
				"Todavía no hay publicaciones recomendadas. Publica algunas entradas y esta sección se llenará sola desde la base de datos activa.",
			noPosts:
				"Todavía no hay publicaciones publicadas. La página principal ya está conectada a Prisma, así que las secciones se llenarán en cuanto existan publicaciones reales.",
			scrollToTrending: "Ir a las publicaciones en tendencia",
			noTrending:
				"Todavía no hay publicaciones en tendencia. Una vez que las publicaciones publicadas empiecen a reunir vistas, aparecerán aquí automáticamente.",
			explore: "Explorar",
			trendingPosts: "Publicaciones en tendencia",
			trendingPostsDescription:
				"Ve qué está captando más atención ahora mismo.",
			recentPosts: "Publicaciones recientes",
			recentPostsDescription:
				"Empieza por los textos más nuevos y retrocede desde ahí.",
			browseByTag: "Explorar por tag",
			browseByTagDescription:
				"Filtra el catálogo en vivo por tema y tags de apoyo.",
			noSectionPost:
				"Todavía no hay una publicación disponible para esta sección.",
			noRecommendedCallouts:
				"Los destacados recomendados aparecerán aquí después de que se publiquen más publicaciones.",
			viewSection: "Ver sección",
		},
		notFound: {
			description: "No se encontró la página que estás buscando.",
			backHome: "Volver a la página de inicio",
		},
		searchBar: {
			placeholder: "Buscar publicaciones",
			ariaLabel: "Buscar publicaciones",
			openSearch: "Abrir búsqueda",
			searchSuggestions: "Sugerencias de búsqueda",
			viewAllResults: "Ver todos los resultados",
		},
		suggestModal: {
			title: "Sugerir una publicación",
			close: "Cerrar modal de sugerencia",
			fieldTitle: "Título",
			titlePlaceholder: "p. ej. Entendiendo React Server Components en Next 14",
			fieldIdea: "¿Cuál es la idea?",
			ideaPlaceholder:
				"Añade un pequeño esquema, viñetas o enlaces para contexto (opcional).",
			reviewNote:
				"Tu sugerencia será revisada antes de publicarse. Evita datos sensibles o información personal.",
			submitted: "Enviado",
			submitting: "Enviando...",
			submit: "Enviar sugerencia",
			titleTooShort: (min: number) =>
				`El título debe tener al menos ${min} caracteres.`,
			maxChars: (max: number) => `Máximo ${max} caracteres.`,
		},
		about: {
			eyebrow: "Sobre devblog",
			title: "Un lugar para escribir, experimentar y seguir publicando",
			description:
				"Este sitio es donde conviven la escritura, el trabajo de interfaz y los experimentos paralelos. La idea es que siga siendo útil, personal y activo en lugar de convertirse en un portafolio estático.",
			storyCards: [
				{
					label: "Por qué existe",
					title: "Un blog que realmente sigo usando",
					text: "DevBlog es mi blog personal de desarrollo de software. Es donde publico tutoriales, opiniones, experimentos, ideas de interfaz y las partes del desarrollo web que más disfruto pulir.",
				},
				{
					label: "Cómo está construido",
					title: "Una stack práctica con espacio para trabajo visual",
					text: "La stack gira en torno a Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser y algunas librerías de apoyo para dar forma a datos y experimentos. El objetivo es mantener el proyecto práctico, simple y agradable de construir sin perder el lado visual del trabajo.",
				},
				{
					label: "Qué más vive aquí",
					title: "Herramientas lúdicas, bocetos e ideas paralelas",
					text: "Además de las publicaciones, el sitio apuesta por la interactividad: descubrimiento guiado por tags, recomendaciones, herramientas para usuarios y un playground lleno de juegos y bocetos. No soy desarrollador de juegos, pero el playground es un buen lugar para proyectos de hobby y otra forma de mostrar lo que puedo construir.",
				},
			],
		},
		playgroundPage: {
			title: "Juegos, bocetos y desvíos jugables",
			description:
				"Esta página es un hogar para experimentos de hobby. Soy principalmente desarrollador web, no desarrollador de juegos, pero estos pequeños proyectos son una forma útil de explorar interacción, movimiento e ideas de renderizado en el navegador.",
			totalProjects: "Total de proyectos",
			projects: "Proyectos",
			playableTitle: "Jugables",
			playableDescription:
				"Experimentos prácticos que puedes controlar directamente, desde juegos hasta pequeños sistemas.",
			watchOnlyTitle: "Solo para ver",
			watchOnlyDescription:
				"Piezas visuales que se entienden mejor como estudios de movimiento que como juegos con puntuación.",
			mode: "Modo",
			loading: "Cargando...",
			closeGame: "Cerrar juego",
			mobileNoticeTitle: "Playground pensado para escritorio",
			mobileNoticeBody:
				"Estos proyectos se diseñaron primero para pantallas más grandes. Puedes seguir explorando aquí, pero en una computadora suelen verse y controlarse como fueron pensados.",
			badges: {
				playable: "Jugable",
				watchOnly: "Solo ver",
			},
			games: {
				chess: { name: "Chess", description: "Juego clásico de ajedrez" },
				snakeGame: {
					name: "Snake Game",
					description: "Juego clásico de la serpiente",
				},
				minesweeper: {
					name: "Minesweeper",
					description: "Buscaminas",
				},
				antSimulator: {
					name: "Ant Simulator",
					description: "Carrera de colonias de hormigas",
				},
				solarSystem: {
					name: "Solar System",
					description: "Danza planetaria",
				},
				terminal: { name: "Terminal", description: "Terminal Linux" },
				tankShooter: {
					name: "Tank Shooter",
					description: "Juego de tanques",
				},
				fallingSand: {
					name: "Falling Sand",
					description: "Arena en caída",
				},
				movingMountains: {
					name: "Moving Mountains",
					description: "Montañas en movimiento",
				},
				survivalShooter: {
					name: "Survival Shooter",
					description: "Shooter de supervivencia",
				},
				tetris: { name: "Tetris", description: "Tetris" },
				binaryPong: {
					name: "Binary Pong",
					description: "Pong binario",
				},
				sineWaves: {
					name: "Sine Waves",
					description: "Ondas sinusoidales",
				},
				voronoiWall: {
					name: "Voronoi Wall",
					description: "Muro de Voronoi",
				},
				"2048": { name: "2048", description: "2048" },
				pacman: { name: "Pacman", description: "Pacman" },
				newtonCannon: {
					name: "Newton Cannon",
					description: "Cañón de Newton",
				},
				flappyBird: {
					name: "Flappy Bird",
					description: "Flappy Bird",
				},
				labyrinthExplorer: {
					name: "Labyrinth Explorer",
					description: "Explorador de laberintos",
				},
			},
		},
		recent: {
			eyebrow: "Publicaciones recientes",
			title: "Las publicaciones más nuevas, en orden",
			description:
				"Esta página es la vista más clara del blog en orden de publicación. Mantiene los textos más nuevos en primer plano, con paginación y señales de temas cerca cuando quieras seguir navegando.",
			postCount: "Cantidad de publicaciones",
			currentPage: "Página actual",
			totalViews: "Vistas totales",
			latestArrival: "Última llegada",
			noPublished:
				"Todavía no hay publicaciones publicadas. Crea tu primera publicación y aparecerá aquí como la llegada más reciente.",
			readingGuide: "Guía de lectura",
			stayOriented: "Mantén el rumbo",
			stayOrientedDescription:
				"Recorre el blog página por página, sigue la entrada más reciente y salta a los temas que aparecen con más frecuencia en el lote más nuevo de publicaciones.",
			showingNow: "Mostrando ahora",
			pageControls: "Controles de página",
			freshTopics: "Temas frescos",
			topicCountsLater:
				"Los conteos de temas aparecerán aquí después de que se publiquen las publicaciones.",
			recentPosts: "Publicaciones recientes",
			recentPostsTitle: "Entradas más nuevas en devblog",
			recentPostsDescription:
				"Ordenadas estrictamente por fecha de publicación para que la página se comporte como un feed realmente reciente y no como una mezcla aleatoria.",
			noPosts:
				"Todavía no hay publicaciones disponibles. Esta página ahora lee directamente de la base de datos y se llenará en cuanto existan entradas publicadas.",
			noPublishedShort: "Todavía no hay publicaciones publicadas",
			relatedTags: (count: number) =>
				`${count} ${count === 1 ? "tag relacionado" : "tags relacionados"}`,
			visibleRange: (start: number, end: number, total: number) =>
				`Publicaciones ${start}-${end} de ${total}`,
			pageOf: (page: number, total: number) => `Página ${page} de ${total}`,
		},
		trending: {
			eyebrow: "En tendencia ahora",
			title: "Lo que los lectores están siguiendo",
			description:
				"El acordeón sigue siendo la firma de la página, pero ahora el resto de la vista la acompaña: publicaciones clasificadas, señales visibles de temas y razones más claras de por qué una publicación está cerca de la cima.",
			trackedPosts: "Publicaciones rastreadas",
			topPost: "Publicación líder",
			totalViews: "Vistas totales",
			noTrending:
				"Todavía no hay publicaciones en tendencia disponibles. Esta sección se llenará una vez que las publicaciones publicadas empiecen a reunir vistas.",
			trendSignals: "Señales de tendencia",
			topicRadar: "Radar de temas",
			topicRadarDescription:
				"Temas principales con mayor presencia en la selección actual de tendencias. Úsalos para llegar a publicaciones relacionadas sin perder el contexto de lo que está caliente ahora.",
			topicSignalsLater:
				"Las señales de temas aparecerán aquí después de que se publiquen las publicaciones.",
			leadingPost: "Publicación líder",
			leadingPostEmpty:
				"Todavía no hay un líder en tendencia. Publica publicaciones y acumula vistas para construir este ranking.",
			ranking: "Ranking",
			topMomentum: "Mejores publicaciones por impulso",
			topMomentumDescription:
				"Las publicaciones más leídas ahora, ordenadas por vistas para que la lista refleje una tendencia real en lugar de una muestra aleatoria.",
			moreToWatch: "Más para seguir",
			risingPosts: "Publicaciones en ascenso",
			risingPostsDescription:
				"Publicaciones justo por debajo del nivel superior que aun así merecen una presentación clara y legible en lugar de otra lista densa.",
			notEnoughPosts:
				"Todavía no hay suficientes publicaciones para una lista secundaria destacada.",
			readPost: "Leer publicación",
			focusPost: (title: string) => `Enfocar ${title}`,
			viewsSuffix: (count: string) => `${count} vistas`,
		},
		search: {
			eyebrow: "Buscar publicaciones",
			description:
				"Explora las publicaciones coincidentes en todo devblog. Los resultados usan las mismas tarjetas que el resto del sitio, con paginación cuando una búsqueda ocupa más de una pantalla.",
			matches: "Coincidencias",
			noMatch: "Sin resultados",
			nothingFound: (query: string) => `No apareció nada para "${query}".`,
			noMatchDescription:
				"Prueba con una búsqueda más corta, busca por tag o autor, o vuelve a las publicaciones recientes para seguir navegando.",
			seeRecentPosts: "Ver publicaciones recientes",
			resultsFor: (query: string) => `Resultados para "${query}"`,
		},
		tag: {
			eyebrow: "Explorar por tag",
			title: "Descubre publicaciones por tema",
			description:
				"Usa tags para acotar el blog rápidamente. Elige un tema principal, añade algunos tags de apoyo y mantén la cuadrícula de resultados a la vista mientras refinas.",
			totalTags: "Total de tags",
			selected: "Seleccionados",
			visiblePosts: "Publicaciones visibles",
			mainTopics: "Temas principales",
			mainTopicsDescription:
				"Las categorías amplias que dan forma a cada publicación.",
			supportingTags: "Tags de apoyo",
			supportingTagsDescription:
				"Úsalos para acotar la cuadrícula sin perder contexto.",
			noPostsYet: "Todavía no hay publicaciones",
			unlockAfterFirstPost:
				"La exploración por tags se desbloqueará después de la primera publicación publicada",
			tagBrowsingDescription:
				"La página de tags ahora lee la base de datos real, así que seguirá vacía hasta que existan publicaciones publicadas y tags para mostrar.",
			noMatches: "Sin coincidencias",
			noPostsFit: "Ninguna publicación encaja con esta combinación",
			noPostsFitDescription:
				"Prueba quitando uno de los tags activos o cambiando a un tema principal más amplio. Las selecciones rápidas del panel de filtros son un buen punto de reinicio.",
			viewsSuffix: (count: string) => `${count} vistas`,
			filterPosts: "Filtrar publicaciones",
			findTopic: "Encuentra un tema",
			filterDescription: (max: number) =>
				`Busca tags, combina hasta ${max} y acota la cuadrícula de publicaciones sin salir de la página.`,
			searchTags: "Buscar tags",
			selectedTags: "Tags seleccionados",
			selectedTagsHint:
				"Añade otro tag para afinar aún más, o reinicia para ampliar los resultados.",
			selectedTagsEmpty:
				"Empieza con un tema amplio y luego suma tags de apoyo si necesitas enfocar los resultados.",
			clearFilters: "Limpiar filtros",
			quickPicks: "Selecciones rápidas",
			quickPicksDescription: "Tags populares que abren la página rápidamente.",
			tagGroupMainDescription:
				"Categorías principales que definen la publicación.",
			tagGroupOtherDescription: "Detalles secundarios y temas relacionados.",
			noTagsMatch: "Ningún tag coincide con la búsqueda actual.",
			resultsSummary: (resultsCount: number, tagCount: number) =>
				`${resultsCount} ${resultsCount === 1 ? "publicación" : "publicaciones"} coinciden con ${tagCount} ${tagCount === 1 ? "tag" : "tags"}`,
			showingAll: (resultsCount: number) =>
				`Mostrando las ${resultsCount} ${resultsCount === 1 ? "publicación" : "publicaciones"}`,
			resultsDescription:
				"Quita un tag para ampliar los resultados o sigue combinando temas relacionados para mantener el foco.",
			resultsDescriptionEmpty:
				"Usa las selecciones rápidas, las filas en movimiento o el panel de filtros para entrar en un tema específico.",
			resetAll: "Reiniciar todo",
			removeTag: (label: string) => `Quitar ${label}`,
			noActiveFilters: "No hay filtros de tags activos.",
		},
		login: {
			eyebrow: "Acceso de miembro",
			title: "Entrar",
			email: "Correo electrónico",
			password: "Contraseña",
			hidePassword: "Ocultar contraseña",
			showPassword: "Mostrar contraseña",
			continue: "Continuar",
			noAccount: "¿No tienes una cuenta?",
			register: "Registrarse",
			invalidCredentials: "Email o contraseña inválidos.",
			unableToLogin: "No es posible iniciar sesión ahora.",
		},
		register: {
			eyebrow: "Crear acceso",
			title: "Registrarse",
			name: "Nombre",
			email: "Correo electrónico",
			password: "Contraseña",
			confirmPassword: "Confirmar contraseña",
			hidePassword: "Ocultar contraseña",
			showPassword: "Mostrar contraseña",
			createAccount: "Crear cuenta",
			haveAccount: "¿Ya tienes una cuenta?",
			login: "Entrar",
			unableToCreate: "No es posible crear la cuenta ahora.",
			accountCreatedLoginFailed:
				"La cuenta se creó, pero falló el inicio de sesión automático.",
			unableToCreateShort: "No es posible crear la cuenta.",
		},
		profile: {
			overview: "Resumen del perfil",
			yourProfile: "Tu perfil",
			description:
				"Los datos reales de la cuenta ahora están respaldados por la base de datos, incluyendo rol, proveedores conectados, campos persistidos del perfil y conteos de actividad en vivo.",
			loadingTitle: "Preparando la página",
			unavailable: "Perfil no disponible",
			goToLogin: "Ir al inicio de sesión",
			bookmarks: "Guardados",
			viewedPosts: "Publicaciones vistas",
			comments: "Comentarios",
			handle: "Usuario",
			email: "Correo electrónico",
			role: "Rol",
			passwordLogin: "Inicio con contraseña",
			configured: "Configurado",
			notSet: "Sin definir",
			connectedAccounts: "Cuentas conectadas",
			credentialsOnly: "Solo credenciales",
			editProfile: "Editar perfil",
			logout: "Salir",
			profileAlt: (name: string) => `Perfil de ${name}`,
			recentActivity: "Actividad reciente en todo el blog",
			noCommentsYet: "Todavía no hay comentarios para mostrar.",
			editedOn: (date: string) => `Editado ${date}`,
			itemCount: (count: number) =>
				`${count} ${count === 1 ? "elemento" : "elementos"}`,
			loadLoginRequired: "Inicia sesión para acceder a tu perfil.",
			loadNotFound: "No se pudo encontrar este perfil.",
			loadError: "No se puede cargar este perfil ahora.",
			saveError: "No se puede guardar el perfil.",
		},
		profileEdit: {
			settingsEyebrow: "Configuración del perfil",
			title: "Editar perfil",
			closeModal: "Cerrar modal de edición de perfil",
			preview: "Vista previa",
			previewAlt: "Vista previa del perfil",
			providerAvailable: "Foto del proveedor disponible",
			providerMissing: "No hay foto del proveedor guardada",
			providerPhoto: "Foto del proveedor",
			generatedAvatar: "Avatar generado",
			uploadPhoto: "Subir foto",
			uploadHint: "JPG, PNG o WEBP de hasta 2MB.",
			uploadedImageLabel: "Imagen subida",
			uploaded: (name: string) => `Subido: ${name}`,
			displayName: "Nombre para mostrar",
			profileUrl: (handle: string) => `URL del perfil: \`/profile/${handle}\``,
			description: "Descripción",
			changePassword: "Cambiar contraseña",
			createPassword: "Crear contraseña",
			changePasswordDescription:
				"Actualiza tu contraseña de acceso por email sin perder tu inicio de sesión social.",
			createPasswordDescription:
				"Añade una contraseña de acceso por email a esta cuenta social.",
			optional: "Opcional",
			currentPassword: "Contraseña actual",
			newPassword: "Nueva contraseña",
			confirmNewPassword: "Confirmar nueva contraseña",
			save: "Guardar perfil",
			saving: "Guardando...",
		},
		profileValidation: {
			nameRequired: "El nombre es obligatorio.",
			maxChars: (max: number) => `Máximo ${max} caracteres.`,
			handleRequired: "El usuario es obligatorio.",
			handleLettersNumbersOnly: "Usa solo letras y números.",
			handleMin: (min: number) =>
				`El usuario debe tener al menos ${min} caracteres.`,
			handleMax: (max: number) =>
				`El usuario debe tener ${max} caracteres o menos.`,
			uploadRequired: "Sube una imagen JPG, PNG o WEBP.",
			uploadAllowed: "Solo se permiten imágenes JPG, PNG o WEBP.",
			uploadMaxSize: "El tamaño máximo de la imagen es 2MB.",
			invalidProviderUrl: (provider: string) => `URL de ${provider} no válida.`,
			currentPasswordIncorrect: "La contraseña actual es incorrecta.",
			handleTaken: "Ese usuario ya está en uso.",
			unableToSave: "No se puede guardar el perfil.",
		},
		newPost: {
			createPageEyebrow: "Nueva publicación",
			createPageTitle: "Crea un artículo listo para producción",
			createPageDescription:
				"Escribe el markdown real, adjunta medios reales y guarda directamente en el backend para que la página del post renderice exactamente el mismo contenido.",
			accessRequiredTitle: "Se requiere acceso de autor",
			accessRequiredDescription:
				"Esta página está reservada para cuentas colaboradoras. Inicia sesión con un perfil con permisos de escritura para redactar, revisar y publicar posts.",
			editPageEyebrow: "Editar publicación",
			editPageTitle: "Actualizar artículo",
			editPageDescription:
				"Refina los metadatos, el cuerpo o los medios y guarda directamente en el mismo registro persistido del post.",
			editAccessDeniedTitle: "Acceso denegado",
			editAccessDeniedDescription:
				"Solo el autor o los administradores del sitio pueden editar esta publicación.",
			role: "Rol",
			author: "Autor",
			defaultAuthor: "Autor",
			language: "Original language",
			languageHelp:
				"This is the language the post was first written in. Translations are attached separately on the edit page.",
			mode: "Modo",
			modeCreating: "Creando",
			modeEditing: "Editando",
			editorEyebrowCreate: "Nueva publicación",
			editorEyebrowEdit: "Editar publicación",
			editorTitleCreate: "Construye la publicación antes de lanzarla",
			editorTitleEdit: "Refina la forma publicada",
			editorDescription:
				"El editor persiste markdown real, rutas reales de medios y metadatos reales del post en Prisma. Lo que previsualizas aquí es lo que se renderiza en la página del post.",
			storySetupEyebrow: "Configuración de la historia",
			storySetupTitle: "Define primero los metadatos",
			title: "Título",
			titlePlaceholder: "Un título que merezca el clic",
			slug: "Slug",
			slugPlaceholder: "slug-de-la-url-del-post",
			regenerate: "Regenerar",
			finalUrl: (slug: string) => `URL final: /post/${slug}`,
			description: "Descripción",
			generateFromContent: "Generar desde el contenido",
			descriptionPlaceholder:
				"¿Qué debería entender el lector antes de abrir el artículo?",
			visualsEyebrow: "Visuales",
			visualsTitle: "Define la miniatura del post",
			thumbnail: "Miniatura",
			thumbnailDescription:
				"Esto define la imagen principal de la página del post y la miniatura de las tarjetas en el resto del sitio.",
			upload: "Subir",
			uploading: "Subiendo...",
			thumbnailPreviewAlt: "Miniatura del post",
			thumbnailEmpty: "Sube la imagen que debe representar la publicación.",
			thumbnailUploaded: "Miniatura subida.",
			thumbnailUploadError: "No se pudo subir la miniatura.",
			thumbnailAlt: "Texto alternativo de la miniatura",
			thumbnailAltPlaceholder:
				"Describe la miniatura para accesibilidad y vistas previas",
			bodyEyebrow: "Cuerpo",
			bodyTitle: "Escribe y revisa en un solo lugar",
			bodyDescription:
				"Escribe en markdown, sube imágenes en línea y verifica el render final antes de guardar.",
			readTime: "Tiempo de lectura",
			taxonomyEyebrow: "Taxonomía",
			taxonomyTitle: "Ubica el artículo",
			mainTag: "Tag principal",
			tags: "Tags",
			readinessEyebrow: "Estado",
			readinessTitle: "Revisa lo esencial",
			checklistTitleSet: "Título definido",
			checklistThumbnailUploaded: "Miniatura subida",
			checklistMainTagChosen: "Tag principal elegida",
			checklistSupportingTagsAdded: "Tags de apoyo añadidas",
			checklistDescriptionReady: "Descripción lista",
			checklistBodyHasSubstance: "Cuerpo con sustancia",
			ready: "Listo",
			missing: "Falta",
			wordCount: (count: number) => `${count} palabras`,
			tagCount: (count: number) =>
				`${count} tag${count === 1 ? "" : "s"} adjunta${count === 1 ? "" : "s"}`,
			currentTarget: (status: string) => `Objetivo actual: ${status}`,
			currentLanguage: (language: string) => `Original language: ${language}`,
			publishEyebrow: "Publicar",
			publishTitle: "Elige el siguiente paso",
			statusDraftLabel: "Guardar borrador",
			statusDraftDescription:
				"Mantén la publicación privada mientras das forma al contenido.",
			statusPendingReviewLabel: "Enviar a revisión",
			statusPendingReviewDescription:
				"Marca el borrador como listo para revisión editorial.",
			statusPublishedLabel: "Publicar ahora",
			statusPublishedDescription:
				"Haz visible la publicación en el sitio de inmediato.",
			saving: "Guardando...",
			clearForm: "Limpiar formulario",
			submitError:
				"No se puede guardar la publicación ahora. Inténtalo de nuevo.",
			submitSuccessPublished: "Publicación publicada.",
			submitSuccessReview: "Publicación enviada a revisión.",
			submitSuccessDraft: "Borrador guardado.",
			mainTagPlaceholder:
				"Elige un tema existente o define una nueva tag principal",
			mainTagHelp:
				"Las tags principales agrupan la publicación en listados y recomendaciones.",
			tagsPlaceholder: "Añade tags y pulsa Enter",
			tagsLimitReached: "Límite de tags alcanzado",
			tagSlotsLeft: (count: number) =>
				`Quedan ${count} espacios para tags. Usa etiquetas concretas y fáciles de buscar.`,
			editorControlsEyebrow: "Controles del editor",
			editorControlsTitle: "Da forma al markdown con intención",
			editorControlsDescription:
				"Las imágenes en línea permanecen donde las insertas y se renderizan centradas tanto en la vista previa como en el post final.",
			modeWrite: "Escribir",
			modeWriteDescription: "Concéntrate en el markdown.",
			modePreview: "Vista previa",
			modePreviewDescription: "Lee el render final.",
			modeSplit: "Dividido",
			modeSplitDescription: "Escribe y previsualiza a la vez.",
			toolbarInline: "En línea",
			toolbarBlocks: "Bloques",
			toolbarBold: "Negrita",
			toolbarItalic: "Cursiva",
			toolbarCode: "Código",
			toolbarLink: "Enlace",
			toolbarCodeBlock: "Bloque de código",
			toolbarHeading: "Encabezado",
			toolbarQuote: "Cita",
			toolbarList: "Lista",
			toolbarNumbered: "Numerada",
			toolbarDivider: "Divisor",
			insertImage: "Insertar imagen",
			dualPanel: "Panel doble",
			modeBadge: (mode: string) => `Modo ${mode}`,
			markdownEyebrow: "Markdown",
			markdownDescription:
				"Escribe con markdown puro y mantén el control de dónde cae cada bloque e imagen.",
			editableSource: "Fuente editable",
			markdownPlaceholder:
				"Escribe el artículo en Markdown.\n\nEjemplo:\n## Título de sección\n\nUn párrafo con **énfasis** y un [enlace](https://example.com).\n",
			previewEyebrow: "Vista previa",
			previewDescription:
				"La vista previa usa el mismo renderizador que la página publicada del post.",
			finalRendering: "Render final",
			emptyPreview:
				"Empieza a escribir para ver el render final de la publicación.",
			editorWordCount: (count: number) => `${count} palabras`,
			editorReadTime: (count: number) => `${count} min de lectura`,
			editorCharacters: (used: number, max: number) =>
				`${used}/${max} caracteres`,
			imagesInserted: (count: number) =>
				`${count} ${count === 1 ? "imagen insertada" : "imágenes insertadas"} en el markdown.`,
			imageDefaultAlt: "Imagen",
			imageUploadError: "No se pudo subir la imagen.",
			translationEyebrow: "Translations",
			translationTitle: "Add or update a localized version",
			translationDescription:
				"Translations override the title, description, thumbnail alt text, and body when a reader is browsing in that language. The slug, tags, and status stay tied to the original post.",
			translationOriginalLanguage: "Original post language",
			translationNoLocales:
				"All supported site languages are already covered by the original post or the saved translations.",
			translationLanguage: "Translation language",
			translationLanguageHelp:
				"Choose the site language that should receive this localized version.",
			translationExisting: "Available translations",
			translationNoneYet: "No translations saved yet.",
			translationStatusExisting: "Editing saved translation",
			translationStatusNew: "Creating new translation",
			translationCopyFromOriginal: "Copy original text",
			translationCopiedFromOriginal:
				"Original post content copied into the translation editor.",
			translationBodyDescription:
				"Write the translated markdown that should replace the original body for this language.",
			translationSave: "Save translation",
			translationSaving: "Saving translation...",
			translationSaveSuccess: "Translation saved.",
			translationSaveError:
				"Unable to save the translation right now. Please try again.",
			translationMustDiffer:
				"Choose a language different from the original post.",
			progressAria: (progress: number, remaining: number) =>
				`${progress}% de progreso, ${remaining} minutos restantes`,
		},
		postValidation: {
			localeRequired: "Post language is required.",
			imageRequired: "La imagen es obligatoria.",
			imageInvalid:
				"La imagen debe ser una ruta de archivo subida o una URL válida.",
			tagEmpty: "Las tags no pueden estar vacías.",
			tagMaxLength: (max: number) =>
				`Las tags deben tener ${max} caracteres o menos.`,
			titleMin: "El título debe tener al menos 3 caracteres.",
			titleMax: (max: number) =>
				`El título debe tener ${max} caracteres o menos.`,
			slugMax: (max: number) => `El slug debe tener ${max} caracteres o menos.`,
			slugInvalid:
				"El slug solo puede contener letras minúsculas, números y guiones.",
			contentMin: "El contenido debe tener al menos 30 caracteres.",
			contentMax: (max: number) =>
				`El contenido debe tener ${max} caracteres o menos.`,
			thumbnailAltMax: (max: number) =>
				`El texto alternativo de la miniatura debe tener ${max} caracteres o menos.`,
			mainTagRequired: "La tag principal es obligatoria.",
			tagsRequired: "Se requiere al menos una tag.",
			tagsMaxItems: (max: number) =>
				`Las tags deben contener ${max} elementos o menos.`,
			tagsUnique: "Las tags deben ser únicas.",
			descriptionMax: (max: number) =>
				`La descripción debe tener ${max} caracteres o menos.`,
		},
		post: {
			relatedReading: "Lectura relacionada",
			moreFromThisLane: "Más de esta línea",
			statusPublished: "Publicado",
			statusPendingReview: "Pendiente de revisión",
			statusDraft: "Borrador",
			translatedToCurrentLanguage: "Translated to your current language",
			translationFromLanguage: (language: string) =>
				`Originally written in ${language}`,
			writtenBy: "Escrito por",
			editPost: "Editar publicación",
			edit: "Editar",
			authorProfile: "Perfil del autor",
			moreIn: (tag: string) => `Más en ${tag}`,
			authorDescription: (
				name: string,
				mainTag: string,
				relatedTopics: string[],
			) =>
				relatedTopics.length > 0
					? `${name} escribe sobre ${mainTag}, con temas recurrentes en ${relatedTopics.join(" y ")}.`
					: `${name} escribe sobre ${mainTag}.`,
			commentSection: "Sección de comentarios",
			commentPlaceholder: "Añade un comentario",
			commentAs: (name: string) => `Comentando como ${name}`,
			loginRequiredToComment: "Debes iniciar sesión para comentar",
			comment: "Comentar",
			postedOn: (date: string) => `Publicado ${date}`,
			reportComment: "Reportar comentario",
			loginModalTitle: "Necesitas iniciar sesión para hacer esto.",
			loginModalDescription:
				"Consigue una mejor experiencia al iniciar sesión. Únete a la conversación.",
			reportCommentTitle: "Reportar comentario",
			reportingCommentBy: (author: string) =>
				`Reportando comentario de ${author}:`,
			reason: "Motivo",
			chooseReason: "Elige un motivo...",
			details: "Detalles",
			detailsOptional: "Detalles (opcional)",
			detailsMin: (min: number) => `Detalles (mín. ${min} caracteres)`,
			describeIssue: "Describe el problema...",
			addContext: "Añade contexto (opcional)...",
			submitReport: "Enviar reporte",
			submitting: "Enviando...",
			reportValidation: "Completa todos los campos obligatorios.",
		},
		authValidation: {
			emailRequired: "El email es obligatorio.",
			emailInvalid: "Introduce un email válido.",
			passwordTooLong: (max: number) =>
				`La contraseña debe tener ${max} caracteres o menos.`,
			passwordRequired: "La contraseña es obligatoria.",
			passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
			nameTooShort: "El nombre debe tener al menos 2 caracteres.",
			nameTooLong: "El nombre debe tener 60 caracteres o menos.",
			confirmPasswordRequired: "Confirma tu contraseña.",
			passwordsDoNotMatch: "Las contraseñas no coinciden.",
			currentPasswordRequired: "La contraseña actual es obligatoria.",
			newPasswordRequired: "La nueva contraseña es obligatoria.",
			confirmNewPasswordRequired: "Confirma tu nueva contraseña.",
		},
	},
} as const;

const germanMessages = {
	...dictionaries.en,
	common: {
		...dictionaries.en.common,
		home: "Startseite",
		recent: "Neueste",
		trending: "Im Trend",
		tags: "Tags",
		about: "Über",
		playground: "Spielwiese",
		profile: "Profil",
		create: "Erstellen",
		suggest: "Vorschlagen",
		login: "Anmelden",
		logout: "Abmelden",
		search: "Suchen",
		close: "Schließen",
		cancel: "Abbrechen",
		results: "Ergebnisse",
		page: "Seite",
		views: "Aufrufe",
		bookmarks: "Lesezeichen",
		comments: "Kommentare",
		author: "Autor",
		edited: "Bearbeitet",
		published: "Veröffentlicht",
		lastSaved: "Zuletzt gespeichert",
		readTime: "Lesezeit",
		minutesShort: "Min",
		previous: "Zurück",
		next: "Weiter",
		loadingProfile: "Profil wird geladen",
		preparingPage: "Seite wird vorbereitet",
		noItemsYet: "Noch keine Elemente zum Anzeigen.",
		noDescriptionYet: "Noch keine Profilbeschreibung.",
		percentComplete: (progress: number) => `${progress}% abgeschlossen`,
	},
	language: {
		...dictionaries.en.language,
		label: "Sprache",
		ariaLabel: "Seitensprache ändern",
		menuTitle: "Sprache wählen",
	},
	header: {
		...dictionaries.en.header,
		eyebrow: "Persönlicher Entwicklungsblog",
		description:
			"Tutorials, Meinungen, Frontend-Notizen und interaktive Nebenprojekte an einem Ort.",
		suggestTitle: "Einen Beitrag vorschlagen (mit Prüfung)",
		homeAria: "Startseite",
	},
	nav: {
		...dictionaries.en.nav,
		navigation: "Navigation",
		openMenu: "Navigationsmenü öffnen",
		closeMenu: "Navigationsmenü schließen",
	},
	footer: {
		...dictionaries.en.footer,
		title: "Beiträge, Experimente, Interface-Arbeit.",
		description:
			"Ein persönlicher Entwicklungsblog mit Texten, Interaktionsstudien und einer Spielwiese für Ideen, die sich leichter zeigen als beschreiben lassen.",
		navigate: "Navigieren",
		socials: "Socials",
		closing: "Artikel, UI-Experimente und interaktive Nebenarbeiten.",
	},
	popover: {
		...dictionaries.en.popover,
		aria: "Beitragsaktionen",
		save: "Zu Lesezeichen hinzufügen",
		share: "Teilen",
		moreLikeThis: "Mehr Beiträge wie dieser",
		lessLikeThis: "Weniger Beiträge wie dieser",
	},
	home: {
		...dictionaries.en.home,
		startHere: "Hier anfangen",
		title: "Ein persönlicher Entwicklungsblog mit Raum zum Entdecken",
		description:
			"DevBlog ist der Ort, an dem ich Texte über Entwicklung, Meinungen, Tutorials und Experimente veröffentliche. Die Startseite hebt empfohlene Lektüre, aktuelle Trends und schnelle Wege in den Rest des Blogs hervor.",
		featuredPosts: "Ausgewählte Beiträge",
		trendingPicks: "Trend-Auswahl",
		recommended: "Empfohlen",
		trendingSnapshot: "Trend-Überblick",
		trendingTitle: "Was gerade Aufmerksamkeit bekommt",
		trendingDescription:
			"Ein schneller Überblick über die Beiträge, die gerade Leser anziehen, mit klarerer Abschnittsstruktur am vertrauten Platz.",
		exploreFurther: "Weiter entdecken",
		exploreTitle: "Mehr Wege in den Blog",
		exploreDescription:
			"Nutze diese Bereiche, um zwischen Neuem, Aktuellem und Beiträgen zu wechseln, die sich erneut lohnen.",
		editorPicks: "Auswahl der Redaktion",
		noRecommended:
			"Noch keine empfohlenen Beiträge. Veröffentliche ein paar Einträge und dieser Bereich füllt sich automatisch aus der Live-Datenbank.",
		noPosts:
			"Noch keine veröffentlichten Beiträge. Die Startseite ist bereits mit Prisma verbunden und füllt sich, sobald echte Beiträge vorhanden sind.",
		scrollToTrending: "Zu Trend-Beiträgen scrollen",
		noTrending:
			"Noch keine Trend-Beiträge. Sobald veröffentlichte Beiträge Aufrufe sammeln, erscheinen sie hier automatisch.",
		explore: "Entdecken",
		trendingPosts: "Trend-Beiträge",
		trendingPostsDescription:
			"Sieh dir an, was gerade die meiste Aufmerksamkeit bekommt.",
		recentPosts: "Neueste Beiträge",
		recentPostsDescription:
			"Beginne mit den neuesten Texten und arbeite dich von dort zurück.",
		browseByTag: "Nach Tag durchsuchen",
		browseByTagDescription:
			"Filtere den Live-Beitragskatalog nach Thema und ergänzenden Tags.",
		noSectionPost: "Für diesen Bereich ist noch kein Beitrag verfügbar.",
		noRecommendedCallouts:
			"Empfohlene Hinweise erscheinen hier, sobald mehr Beiträge veröffentlicht sind.",
		viewSection: "Bereich ansehen",
	},
	notFound: {
		...dictionaries.en.notFound,
		description: "Die gesuchte Seite konnte nicht gefunden werden.",
		backHome: "Zur Startseite zurück",
	},
	searchBar: {
		...dictionaries.en.searchBar,
		placeholder: "Beiträge suchen",
		ariaLabel: "Beiträge suchen",
		openSearch: "Suche öffnen",
		searchSuggestions: "Suchvorschläge",
		viewAllResults: "Alle Ergebnisse anzeigen",
	},
	suggestModal: {
		...dictionaries.en.suggestModal,
		title: "Einen Beitrag vorschlagen",
		close: "Dialog zum Vorschlagen eines Beitrags schließen",
		fieldTitle: "Titel",
		titlePlaceholder: "z. B. React Server Components in Next 14 verstehen",
		fieldIdea: "Worum geht es?",
		ideaPlaceholder:
			"Füge eine kurze Gliederung, Stichpunkte oder Links als Kontext hinzu (optional).",
		reviewNote:
			"Dein Vorschlag wird vor der Veröffentlichung geprüft. Bitte vermeide sensible Daten oder persönliche Informationen.",
		submitted: "Gesendet!",
		submitting: "Wird gesendet...",
		submit: "Vorschlag senden",
		titleTooShort: (min: number) =>
			`Der Titel muss mindestens ${min} Zeichen lang sein.`,
		maxChars: (max: number) => `Maximal ${max} Zeichen.`,
	},
	about: {
		...dictionaries.en.about,
		eyebrow: "Über devblog",
		title: "Ein Ort zum Schreiben, Experimentieren und Weiterliefern",
		description:
			"Diese Seite ist der Ort, an dem Texte, Interface-Arbeit und Nebenexperimente zusammenkommen. Sie soll nützlich, persönlich und aktiv bleiben statt zu einem statischen Portfolio-Archiv zu werden.",
		storyCards: [
			{
				label: "Warum es das gibt",
				title: "Ein Blog, den ich tatsächlich weiter nutze",
				text: "DevBlog ist mein persönlicher Blog über Softwareentwicklung. Hier veröffentliche ich Tutorials, Meinungen, Experimente, Interface-Ideen und die Bereiche der Webentwicklung, die ich am liebsten verfeinere.",
			},
			{
				label: "Wie er gebaut ist",
				title: "Ein praktischer Stack mit Raum für visuelle Arbeit",
				text: "Der Stack basiert auf Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser und einigen unterstützenden Bibliotheken für Datenaufbereitung und Experimente. Ziel ist es, das Projekt praktisch, einfach und angenehm zu bauen, ohne die visuelle Seite der Arbeit zu verlieren.",
			},
			{
				label: "Was hier sonst noch lebt",
				title: "Verspielte Tools, Skizzen und Nebenideen",
				text: "Neben Beiträgen setzt die Seite auf Interaktivität: taggesteuerte Entdeckung, Empfehlungen, Nutzerwerkzeuge und eine Spielwiese voller Spiele und Skizzen. Ich bin kein Spieleentwickler, aber die Spielwiese ist ein guter Ort für Hobbyprojekte und eine weitere Möglichkeit zu zeigen, was ich bauen kann.",
			},
		],
	},
	playgroundPage: {
		...dictionaries.en.playgroundPage,
		title: "Spiele, Skizzen und spielbare Umwege",
		description:
			"Diese Seite ist ein Zuhause für Hobby-Experimente. Ich bin in erster Linie Webentwickler und kein Spieleentwickler, aber diese kleinen Projekte sind eine gute Möglichkeit, Interaktion, Bewegung und Ideen zur Browser-Darstellung zu erkunden.",
		totalProjects: "Projekte insgesamt",
		projects: "Projekte",
		playableTitle: "Spielbar",
		playableDescription:
			"Praktische Experimente, die du direkt steuern kannst, von Spielen bis zu kleinen Systemen.",
		watchOnlyTitle: "Nur ansehen",
		watchOnlyDescription:
			"Visuelle Arbeiten, die eher als Bewegungsstudien als als punktbasierte Spiele gedacht sind.",
		mode: "Modus",
		loading: "Wird geladen...",
		closeGame: "Spiel schließen",
		badges: {
			playable: "Spielbar",
			watchOnly: "Nur ansehen",
		},
		games: {
			chess: { name: "Chess", description: "Klassisches Schachspiel" },
			snakeGame: {
				name: "Snake Game",
				description: "Klassisches Snake-Spiel",
			},
			minesweeper: {
				name: "Minesweeper",
				description: "Minesweeper",
			},
			antSimulator: {
				name: "Ant Simulator",
				description: "Rennen von Ameisenkolonien",
			},
			solarSystem: {
				name: "Solar System",
				description: "Planetentanz",
			},
			terminal: { name: "Terminal", description: "Linux-Terminal" },
			tankShooter: {
				name: "Tank Shooter",
				description: "Panzer-Shooter",
			},
			fallingSand: {
				name: "Falling Sand",
				description: "Fallender Sand",
			},
			movingMountains: {
				name: "Moving Mountains",
				description: "Bewegte Berge",
			},
			survivalShooter: {
				name: "Survival Shooter",
				description: "Survival-Shooter",
			},
			tetris: { name: "Tetris", description: "Tetris" },
			binaryPong: {
				name: "Binary Pong",
				description: "Binäres Pong",
			},
			sineWaves: {
				name: "Sine Waves",
				description: "Sinuswellen",
			},
			voronoiWall: {
				name: "Voronoi Wall",
				description: "Voronoi-Wand",
			},
			"2048": { name: "2048", description: "2048" },
			pacman: { name: "Pacman", description: "Pacman" },
			newtonCannon: {
				name: "Newton Cannon",
				description: "Newtons Kanone",
			},
			flappyBird: {
				name: "Flappy Bird",
				description: "Flappy Bird",
			},
			labyrinthExplorer: {
				name: "Labyrinth Explorer",
				description: "Labyrinth-Explorer",
			},
		},
	},
	recent: {
		...dictionaries.en.recent,
		eyebrow: "Neueste Beiträge",
		title: "Die neuesten Beiträge, der Reihe nach",
		description:
			"Diese Seite ist die klarste Ansicht des Blogs in Veröffentlichungsreihenfolge. Sie hält die neuesten Texte im Vordergrund, mit Pagination und Themenhinweisen in Reichweite.",
		postCount: "Anzahl Beiträge",
		currentPage: "Aktuelle Seite",
		totalViews: "Gesamtaufrufe",
		latestArrival: "Neuester Zugang",
		noPublished:
			"Noch keine veröffentlichten Beiträge. Erstelle deinen ersten Beitrag und er erscheint hier als neuester Zugang.",
		readingGuide: "Lesehilfe",
		stayOriented: "Den Überblick behalten",
		stayOrientedDescription:
			"Bewege dich Seite für Seite durch den Blog, behalte den neuesten Eintrag im Blick und springe zu Themen, die im neuesten Beitragsstapel häufig auftauchen.",
		showingNow: "Aktuell sichtbar",
		pageControls: "Seitensteuerung",
		freshTopics: "Frische Themen",
		topicCountsLater:
			"Themenzahlen erscheinen hier, sobald Beiträge veröffentlicht sind.",
		recentPosts: "Neueste Beiträge",
		recentPostsTitle: "Neueste Einträge auf devblog",
		recentPostsDescription:
			"Strikt nach Veröffentlichungsdatum sortiert, damit die Seite wie ein echter Feed neuer Beiträge funktioniert.",
		noPosts:
			"Noch keine Beiträge verfügbar. Diese Seite liest jetzt direkt aus der Datenbank und füllt sich, sobald veröffentlichte Einträge vorhanden sind.",
		noPublishedShort: "Noch keine veröffentlichten Beiträge",
		relatedTags: (count: number) =>
			`${count} verwandte ${count === 1 ? "Tag" : "Tags"}`,
		visibleRange: (start: number, end: number, total: number) =>
			`Beiträge ${start}-${end} von ${total}`,
		pageOf: (page: number, total: number) => `Seite ${page} von ${total}`,
	},
	trending: {
		...dictionaries.en.trending,
		eyebrow: "Gerade im Trend",
		title: "Worauf Leser gerade achten",
		description:
			"Das Akkordeon bleibt das Markenzeichen der Seite, aber der Rest unterstützt es jetzt: gerankte Beiträge, sichtbare Themensignale und klarere Gründe dafür, warum ein Beitrag weit oben steht.",
		trackedPosts: "Verfolgte Beiträge",
		topPost: "Top-Beitrag",
		totalViews: "Gesamtaufrufe",
		noTrending:
			"Noch keine Trend-Beiträge verfügbar. Dieser Bereich füllt sich, sobald veröffentlichte Beiträge Aufrufe sammeln.",
		trendSignals: "Trend-Signale",
		topicRadar: "Themenradar",
		topicRadarDescription:
			"Hauptthemen mit der stärksten Präsenz im aktuellen Trend-Stapel. Nutze sie, um zu verwandten Beiträgen zu wechseln, ohne den Kontext dessen zu verlieren, was gerade heiß ist.",
		topicSignalsLater:
			"Themensignale erscheinen hier, sobald Beiträge veröffentlicht sind.",
		leadingPost: "Führender Beitrag",
		leadingPostEmpty:
			"Noch kein Trend-Spitzenreiter. Veröffentliche Beiträge und sammle Aufrufe, um dieses Ranking aufzubauen.",
		ranking: "Ranking",
		topMomentum: "Top-Beiträge nach Dynamik",
		topMomentumDescription:
			"Die derzeit meistgelesenen Beiträge, nach Aufrufen sortiert, damit die Liste tatsächlich einen Trend abbildet.",
		moreToWatch: "Mehr im Blick behalten",
		risingPosts: "Aufstrebende Beiträge",
		risingPostsDescription:
			"Beiträge knapp unter der Spitzengruppe, die dennoch eine klare, gut lesbare Darstellung verdienen.",
		notEnoughPosts:
			"Noch nicht genug Beiträge für eine zweite Spotlight-Liste.",
		readPost: "Beitrag lesen",
		focusPost: (title: string) => `${title} fokussieren`,
		viewsSuffix: (count: string) => `${count} Aufrufe`,
	},
	search: {
		...dictionaries.en.search,
		eyebrow: "Beiträge suchen",
		description:
			"Durchsuche passende Beiträge auf devblog. Die Ergebnisse verwenden dieselben Karten wie der Rest der Seite, mit Pagination bei längeren Anfragen.",
		matches: "Treffer",
		noMatch: "Kein Treffer",
		nothingFound: (query: string) => `Für "${query}" wurde nichts gefunden.`,
		noMatchDescription:
			"Versuche eine kürzere Suche, suche nach Tag oder Autor oder springe zu den neuesten Beiträgen.",
		seeRecentPosts: "Neueste Beiträge ansehen",
		resultsFor: (query: string) => `Ergebnisse für "${query}"`,
	},
	tag: {
		...dictionaries.en.tag,
		eyebrow: "Nach Tag durchsuchen",
		title: "Beiträge nach Thema entdecken",
		description:
			"Nutze Tags, um den Blog schnell einzugrenzen. Wähle ein Hauptthema, kombiniere ergänzende Tags und behalte das Ergebnisraster im Blick.",
		totalTags: "Gesamtzahl Tags",
		selected: "Ausgewählt",
		visiblePosts: "Sichtbare Beiträge",
		mainTopics: "Hauptthemen",
		mainTopicsDescription: "Die breiten Kategorien, die jeden Beitrag prägen.",
		supportingTags: "Ergänzende Tags",
		supportingTagsDescription:
			"Nutze diese, um das Raster einzugrenzen, ohne den Kontext zu verlieren.",
		noPostsYet: "Noch keine Beiträge",
		unlockAfterFirstPost:
			"Die Tag-Ansicht wird nach dem ersten veröffentlichten Beitrag freigeschaltet",
		tagBrowsingDescription:
			"Die Tag-Seite liest jetzt die echte Datenbank und bleibt leer, bis veröffentlichte Beiträge und Tags vorhanden sind.",
		noMatches: "Keine Treffer",
		noPostsFit: "Keine Beiträge passen zu dieser Kombination",
		noPostsFitDescription:
			"Entferne einen aktiven Tag oder wechsle zu einem breiteren Hauptthema. Die Schnellwahl im Filterbereich ist ein guter Reset-Punkt.",
		viewsSuffix: (count: string) => `${count} Aufrufe`,
		filterPosts: "Beiträge filtern",
		findTopic: "Thema finden",
		filterDescription: (max: number) =>
			`Suche Tags, kombiniere bis zu ${max} und verenge das Beitragsraster, ohne die Seite zu verlassen.`,
		searchTags: "Tags suchen",
		selectedTags: "Ausgewählte Tags",
		selectedTagsHint:
			"Füge einen weiteren Tag hinzu, um stärker zu filtern, oder setze zurück, um die Ergebnisse zu erweitern.",
		selectedTagsEmpty:
			"Beginne mit einem breiten Thema und ergänze unterstützende Tags, wenn du die Ergebnisse eingrenzen möchtest.",
		clearFilters: "Filter löschen",
		quickPicks: "Schnellauswahl",
		quickPicksDescription: "Beliebte Tags, die die Seite schnell öffnen.",
		tagGroupMainDescription: "Primäre Kategorien, die den Beitrag definieren.",
		tagGroupOtherDescription: "Sekundäre Details und verwandte Themen.",
		noTagsMatch: "Keine Tags passen zur aktuellen Suche.",
		resultsSummary: (resultsCount: number, tagCount: number) =>
			`${resultsCount} ${resultsCount === 1 ? "Beitrag" : "Beiträge"} passend zu ${tagCount} ${tagCount === 1 ? "Tag" : "Tags"}`,
		showingAll: (resultsCount: number) =>
			`Alle ${resultsCount} ${resultsCount === 1 ? "Beitrag" : "Beiträge"} werden angezeigt`,
		resultsDescription:
			"Entferne einen Tag, um die Ergebnisse zu erweitern, oder kombiniere verwandte Themen, um fokussiert zu bleiben.",
		resultsDescriptionEmpty:
			"Nutze Schnellwahl, markante Reihen oder das Filterpanel, um in ein bestimmtes Thema einzusteigen.",
		resetAll: "Alles zurücksetzen",
		removeTag: (label: string) => `${label} entfernen`,
		noActiveFilters: "Keine aktiven Tag-Filter.",
	},
	login: {
		...dictionaries.en.login,
		eyebrow: "Mitgliederzugang",
		title: "Anmelden",
		email: "E-Mail",
		password: "Passwort",
		hidePassword: "Passwort verbergen",
		showPassword: "Passwort anzeigen",
		continue: "Weiter",
		noAccount: "Noch kein Konto?",
		register: "Registrieren",
		invalidCredentials: "Ungültige E-Mail oder ungültiges Passwort.",
		unableToLogin: "Anmeldung derzeit nicht möglich.",
	},
	register: {
		...dictionaries.en.register,
		eyebrow: "Zugang erstellen",
		title: "Registrieren",
		name: "Name",
		email: "E-Mail",
		password: "Passwort",
		confirmPassword: "Passwort bestätigen",
		hidePassword: "Passwort verbergen",
		showPassword: "Passwort anzeigen",
		createAccount: "Konto erstellen",
		haveAccount: "Hast du bereits ein Konto?",
		login: "Anmelden",
		unableToCreate: "Konto kann derzeit nicht erstellt werden.",
		accountCreatedLoginFailed:
			"Konto erstellt, aber automatische Anmeldung fehlgeschlagen.",
		unableToCreateShort: "Konto konnte nicht erstellt werden.",
	},
	profile: {
		...dictionaries.en.profile,
		overview: "Profilübersicht",
		yourProfile: "Dein Profil",
		description:
			"Echte Kontodaten werden jetzt aus der Datenbank geladen, einschließlich Rolle, verbundener Anbieter, gespeicherter Profilfelder und Live-Aktivitätszahlen.",
		loadingTitle: "Seite wird vorbereitet",
		unavailable: "Profil nicht verfügbar",
		goToLogin: "Zur Anmeldung",
		bookmarks: "Lesezeichen",
		viewedPosts: "Angesehene Beiträge",
		comments: "Kommentare",
		handle: "Handle",
		email: "E-Mail",
		role: "Rolle",
		passwordLogin: "Passwort-Login",
		configured: "Eingerichtet",
		notSet: "Nicht gesetzt",
		connectedAccounts: "Verbundene Konten",
		credentialsOnly: "Nur Zugangsdaten",
		editProfile: "Profil bearbeiten",
		logout: "Abmelden",
		profileAlt: (name: string) => `${name}-Profil`,
		recentActivity: "Letzte Aktivität im gesamten Blog",
		noCommentsYet: "Noch keine Kommentare zum Anzeigen.",
		editedOn: (date: string) => `Bearbeitet ${date}`,
		itemCount: (count: number) =>
			`${count} ${count === 1 ? "Element" : "Elemente"}`,
		loadLoginRequired: "Bitte melde dich an, um dein Profil zu öffnen.",
		loadNotFound: "Dieses Profil wurde nicht gefunden.",
		loadError: "Dieses Profil kann derzeit nicht geladen werden.",
		saveError: "Profil konnte nicht gespeichert werden.",
	},
	profileEdit: {
		...dictionaries.en.profileEdit,
		settingsEyebrow: "Profileinstellungen",
		title: "Profil bearbeiten",
		closeModal: "Dialog zum Bearbeiten des Profils schließen",
		preview: "Vorschau",
		previewAlt: "Profilvorschau",
		providerAvailable: "Anbieterfoto verfügbar",
		providerMissing: "Kein Anbieterfoto hinterlegt",
		providerPhoto: "Anbieterfoto",
		generatedAvatar: "Generierter Avatar",
		uploadPhoto: "Foto hochladen",
		uploadHint: "JPG, PNG oder WEBP bis 2 MB.",
		uploadedImageLabel: "Hochgeladenes Bild",
		uploaded: (name: string) => `Hochgeladen: ${name}`,
		displayName: "Anzeigename",
		profileUrl: (handle: string) => `Profil-URL: \`/profile/${handle}\``,
		description: "Beschreibung",
		changePassword: "Passwort ändern",
		createPassword: "Passwort erstellen",
		changePasswordDescription:
			"Aktualisiere dein E-Mail-Login-Passwort, ohne dein Social-Login zu verlieren.",
		createPasswordDescription:
			"Füge diesem Social-Konto ein E-Mail-Login-Passwort hinzu.",
		optional: "Optional",
		currentPassword: "Aktuelles Passwort",
		newPassword: "Neues Passwort",
		confirmNewPassword: "Neues Passwort bestätigen",
		save: "Profil speichern",
		saving: "Wird gespeichert...",
	},
	profileValidation: {
		...dictionaries.en.profileValidation,
		nameRequired: "Name ist erforderlich.",
		maxChars: (max: number) => `Maximal ${max} Zeichen.`,
		handleRequired: "Handle ist erforderlich.",
		handleLettersNumbersOnly: "Verwende nur Buchstaben und Zahlen.",
		handleMin: (min: number) =>
			`Der Handle muss mindestens ${min} Zeichen lang sein.`,
		handleMax: (max: number) =>
			`Der Handle darf höchstens ${max} Zeichen haben.`,
		uploadRequired: "Lade ein JPG-, PNG- oder WEBP-Bild hoch.",
		uploadAllowed: "Nur JPG-, PNG- oder WEBP-Bilder sind erlaubt.",
		uploadMaxSize: "Die maximale Bildgröße beträgt 2 MB.",
		invalidProviderUrl: (provider: string) => `Ungültige ${provider}-URL.`,
		currentPasswordIncorrect: "Das aktuelle Passwort ist falsch.",
		handleTaken: "Dieser Handle ist bereits vergeben.",
		unableToSave: "Profil konnte nicht gespeichert werden.",
	},
	newPost: {
		...dictionaries.en.newPost,
		createPageEyebrow: "Neuer Beitrag",
		createPageTitle: "Einen produktionsreifen Artikel erstellen",
		createPageDescription:
			"Schreibe echtes Markdown, hänge echte Medien an und speichere direkt ins Backend, damit die Beitragsseite exakt denselben Inhalt rendert.",
		accessRequiredTitle: "Autorenzugang erforderlich",
		accessRequiredDescription:
			"Diese Seite ist für Beitragende reserviert. Melde dich mit einem Profil mit Schreibrechten an, um Beiträge zu entwerfen, zu prüfen und zu veröffentlichen.",
		editPageEyebrow: "Beitrag bearbeiten",
		editPageTitle: "Artikel aktualisieren",
		editPageDescription:
			"Verfeinere Metadaten, Inhalt oder Medien und speichere direkt zurück in denselben persistenten Beitrag.",
		editAccessDeniedTitle: "Zugriff verweigert",
		editAccessDeniedDescription:
			"Nur der Autor oder Administratoren der Website dürfen diesen Beitrag bearbeiten.",
		role: "Rolle",
		author: "Autor",
		defaultAuthor: "Autor",
		mode: "Modus",
		modeCreating: "Erstellen",
		modeEditing: "Bearbeiten",
		editorEyebrowCreate: "Neuer Beitrag",
		editorEyebrowEdit: "Beitrag bearbeiten",
		editorTitleCreate: "Baue den Beitrag fertig, bevor er online geht",
		editorTitleEdit: "Die veröffentlichte Form verfeinern",
		editorDescription:
			"Der Editor speichert echtes Markdown, echte Medienpfade und echte Beitragsmetadaten in Prisma. Was du hier siehst, ist das, was auf der Beitragsseite gerendert wird.",
		storySetupEyebrow: "Beitragsaufbau",
		storySetupTitle: "Zuerst die Metadaten festlegen",
		title: "Titel",
		titlePlaceholder: "Ein Titel, der den Klick verdient",
		slug: "Slug",
		slugPlaceholder: "beitrags-url-slug",
		regenerate: "Neu erzeugen",
		finalUrl: (slug: string) => `Endgültige URL: /post/${slug}`,
		description: "Beschreibung",
		generateFromContent: "Aus dem Inhalt erzeugen",
		descriptionPlaceholder:
			"Was soll der Leser verstehen, bevor er den Artikel öffnet?",
		visualsEyebrow: "Visuals",
		visualsTitle: "Beitrags-Thumbnail festlegen",
		thumbnail: "Thumbnail",
		thumbnailDescription:
			"Es steuert das Hero-Bild auf der Beitragsseite und das Karten-Thumbnail an allen anderen Stellen.",
		upload: "Hochladen",
		uploading: "Wird hochgeladen...",
		thumbnailPreviewAlt: "Beitrags-Thumbnail",
		thumbnailEmpty: "Lade das Bild hoch, das den Beitrag repräsentieren soll.",
		thumbnailUploaded: "Thumbnail hochgeladen.",
		thumbnailUploadError: "Thumbnail konnte nicht hochgeladen werden.",
		thumbnailAlt: "Alternativtext des Thumbnails",
		thumbnailAltPlaceholder:
			"Beschreibe das Thumbnail für Barrierefreiheit und Vorschauen",
		bodyEyebrow: "Inhalt",
		bodyTitle: "Schreiben und prüfen an einem Ort",
		bodyDescription:
			"Schreibe in Markdown, lade eingebettete Bilder hoch und prüfe das finale Rendering vor dem Speichern.",
		readTime: "Lesezeit",
		taxonomyEyebrow: "Taxonomie",
		taxonomyTitle: "Den Artikel einordnen",
		mainTag: "Haupt-Tag",
		tags: "Tags",
		readinessEyebrow: "Bereitschaft",
		readinessTitle: "Das Wesentliche prüfen",
		checklistTitleSet: "Titel gesetzt",
		checklistThumbnailUploaded: "Thumbnail hochgeladen",
		checklistMainTagChosen: "Haupt-Tag gewählt",
		checklistSupportingTagsAdded: "Ergänzende Tags hinzugefügt",
		checklistDescriptionReady: "Beschreibung fertig",
		checklistBodyHasSubstance: "Inhalt hat Substanz",
		ready: "Bereit",
		missing: "Fehlt",
		wordCount: (count: number) => `${count} Wörter`,
		tagCount: (count: number) =>
			`${count} ${count === 1 ? "Tag" : "Tags"} angehängt`,
		currentTarget: (status: string) => `Aktuelles Ziel: ${status}`,
		publishEyebrow: "Veröffentlichen",
		publishTitle: "Nächsten Schritt wählen",
		statusDraftLabel: "Entwurf speichern",
		statusDraftDescription:
			"Halte den Beitrag privat, während du den Inhalt formst.",
		statusPendingReviewLabel: "Zur Prüfung senden",
		statusPendingReviewDescription:
			"Markiere den Entwurf als bereit für die redaktionelle Prüfung.",
		statusPublishedLabel: "Jetzt veröffentlichen",
		statusPublishedDescription:
			"Den Beitrag sofort auf der Website sichtbar machen.",
		saving: "Wird gespeichert...",
		clearForm: "Formular leeren",
		submitError:
			"Der Beitrag kann derzeit nicht gespeichert werden. Bitte versuche es erneut.",
		submitSuccessPublished: "Beitrag veröffentlicht.",
		submitSuccessReview: "Beitrag zur Prüfung gesendet.",
		submitSuccessDraft: "Entwurf gespeichert.",
		mainTagPlaceholder:
			"Ein bestehendes Thema wählen oder einen neuen Haupt-Tag definieren",
		mainTagHelp:
			"Haupt-Tags gruppieren den Beitrag in Listen und Empfehlungen.",
		tagsPlaceholder: "Tags hinzufügen und Enter drücken",
		tagsLimitReached: "Tag-Limit erreicht",
		tagSlotsLeft: (count: number) =>
			`Noch ${count} freie Tag-Plätze. Nutze präzise, gut auffindbare Begriffe.`,
		editorControlsEyebrow: "Editor-Steuerung",
		editorControlsTitle: "Markdown mit Absicht formen",
		editorControlsDescription:
			"Eingebettete Bilder bleiben an der Stelle, an der du sie einfügst, und werden sowohl in der Vorschau als auch im finalen Beitrag zentriert gerendert.",
		modeWrite: "Schreiben",
		modeWriteDescription: "Auf das Markdown konzentrieren.",
		modePreview: "Vorschau",
		modePreviewDescription: "Das finale Rendering lesen.",
		modeSplit: "Geteilt",
		modeSplitDescription: "Schreiben und Vorschau gleichzeitig.",
		toolbarInline: "Inline",
		toolbarBlocks: "Blöcke",
		toolbarBold: "Fett",
		toolbarItalic: "Kursiv",
		toolbarCode: "Code",
		toolbarLink: "Link",
		toolbarCodeBlock: "Codeblock",
		toolbarHeading: "Überschrift",
		toolbarQuote: "Zitat",
		toolbarList: "Liste",
		toolbarNumbered: "Nummeriert",
		toolbarDivider: "Trenner",
		insertImage: "Bild einfügen",
		dualPanel: "Doppelansicht",
		modeBadge: (mode: string) => `${mode}-Modus`,
		markdownEyebrow: "Markdown",
		markdownDescription:
			"Schreibe in reinem Markdown und behalte die Kontrolle darüber, wo jeder Block und jedes Bild landet.",
		editableSource: "Bearbeitbare Quelle",
		markdownPlaceholder:
			"Schreibe den Artikel in Markdown.\n\nBeispiel:\n## Abschnittstitel\n\nEin Absatz mit **Hervorhebung** und einem [Link](https://example.com).\n",
		previewEyebrow: "Vorschau",
		previewDescription:
			"Die Vorschau verwendet denselben Renderer wie die veröffentlichte Beitragsseite.",
		finalRendering: "Finales Rendering",
		emptyPreview:
			"Beginne zu schreiben, um das finale Rendering des Beitrags zu sehen.",
		editorWordCount: (count: number) => `${count} Wörter`,
		editorReadTime: (count: number) => `${count} Min Lesezeit`,
		editorCharacters: (used: number, max: number) => `${used}/${max} Zeichen`,
		imagesInserted: (count: number) =>
			`${count} ${count === 1 ? "Bild" : "Bilder"} in das Markdown eingefügt.`,
		imageDefaultAlt: "Bild",
		imageUploadError: "Bild konnte nicht hochgeladen werden.",
		progressAria: (progress: number, remaining: number) =>
			`${progress}% Fortschritt, ${remaining} Minuten verbleibend`,
	},
	postValidation: {
		...dictionaries.en.postValidation,
		imageRequired: "Ein Bild ist erforderlich.",
		imageInvalid:
			"Das Bild muss ein hochgeladener Dateipfad oder eine gültige URL sein.",
		tagEmpty: "Tags dürfen nicht leer sein.",
		tagMaxLength: (max: number) =>
			`Tags dürfen höchstens ${max} Zeichen lang sein.`,
		titleMin: "Der Titel muss mindestens 3 Zeichen lang sein.",
		titleMax: (max: number) => `Der Titel darf höchstens ${max} Zeichen haben.`,
		slugMax: (max: number) => `Der Slug darf höchstens ${max} Zeichen haben.`,
		slugInvalid:
			"Der Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.",
		contentMin: "Der Inhalt muss mindestens 30 Zeichen lang sein.",
		contentMax: (max: number) =>
			`Der Inhalt darf höchstens ${max} Zeichen haben.`,
		thumbnailAltMax: (max: number) =>
			`Der Alternativtext des Thumbnails darf höchstens ${max} Zeichen haben.`,
		mainTagRequired: "Ein Haupt-Tag ist erforderlich.",
		tagsRequired: "Mindestens ein Tag ist erforderlich.",
		tagsMaxItems: (max: number) =>
			`Tags dürfen höchstens ${max} Elemente enthalten.`,
		tagsUnique: "Tags müssen eindeutig sein.",
		descriptionMax: (max: number) =>
			`Die Beschreibung darf höchstens ${max} Zeichen haben.`,
	},
	post: {
		...dictionaries.en.post,
		relatedReading: "Verwandte Lektüre",
		moreFromThisLane: "Mehr aus diesem Bereich",
		statusPublished: "Veröffentlicht",
		statusPendingReview: "In Prüfung",
		statusDraft: "Entwurf",
		writtenBy: "Geschrieben von",
		editPost: "Beitrag bearbeiten",
		edit: "Bearbeiten",
		authorProfile: "Autorenprofil",
		moreIn: (tag: string) => `Mehr in ${tag}`,
		authorDescription: (
			name: string,
			mainTag: string,
			relatedTopics: string[],
		) =>
			relatedTopics.length > 0
				? `${name} schreibt rund um ${mainTag}, mit wiederkehrenden Themen in ${relatedTopics.join(" und ")}.`
				: `${name} schreibt rund um ${mainTag}.`,
		commentSection: "Kommentarbereich",
		commentPlaceholder: "Kommentar hinzufügen",
		commentAs: (name: string) => `Kommentierst als ${name}`,
		loginRequiredToComment: "Zum Kommentieren anmelden",
		comment: "Kommentieren",
		postedOn: (date: string) => `Veröffentlicht ${date}`,
		reportComment: "Kommentar melden",
		loginModalTitle: "Du musst dafür angemeldet sein.",
		loginModalDescription:
			"Mit Anmeldung wird die Erfahrung besser. Mach bei der Unterhaltung mit.",
		reportCommentTitle: "Kommentar melden",
		reportingCommentBy: (author: string) =>
			`Kommentar von ${author} wird gemeldet:`,
		reason: "Grund",
		chooseReason: "Grund auswählen...",
		details: "Details",
		detailsOptional: "Details (optional)",
		detailsMin: (min: number) => `Details (mind. ${min} Zeichen)`,
		describeIssue: "Beschreibe das Problem...",
		addContext: "Kontext hinzufügen (optional)...",
		submitReport: "Meldung senden",
		submitting: "Wird gesendet...",
		reportValidation: "Bitte alle Pflichtfelder ausfüllen.",
	},
	authValidation: {
		...dictionaries.en.authValidation,
		emailRequired: "E-Mail ist erforderlich.",
		emailInvalid: "Gib eine gültige E-Mail-Adresse ein.",
		passwordTooLong: (max: number) =>
			`Das Passwort darf höchstens ${max} Zeichen haben.`,
		passwordRequired: "Passwort ist erforderlich.",
		passwordTooShort: "Das Passwort muss mindestens 8 Zeichen lang sein.",
		nameTooShort: "Der Name muss mindestens 2 Zeichen lang sein.",
		nameTooLong: "Der Name darf höchstens 60 Zeichen haben.",
		confirmPasswordRequired: "Bitte bestätige dein Passwort.",
		passwordsDoNotMatch: "Die Passwörter stimmen nicht überein.",
		currentPasswordRequired: "Das aktuelle Passwort ist erforderlich.",
		newPasswordRequired: "Das neue Passwort ist erforderlich.",
		confirmNewPasswordRequired: "Bitte bestätige dein neues Passwort.",
	},
} as unknown as typeof dictionaries.en;

const russianMessages = {
	...dictionaries.en,
	common: {
		...dictionaries.en.common,
		home: "Главная",
		recent: "Недавние",
		trending: "В тренде",
		tags: "Теги",
		about: "О сайте",
		playground: "Песочница",
		profile: "Профиль",
		create: "Создать",
		suggest: "Предложить",
		login: "Войти",
		logout: "Выйти",
		search: "Поиск",
		close: "Закрыть",
		cancel: "Отмена",
		results: "Результаты",
		page: "Страница",
		views: "Просмотры",
		bookmarks: "Закладки",
		comments: "Комментарии",
		author: "Автор",
		edited: "Изменено",
		published: "Опубликовано",
		lastSaved: "Последнее сохранение",
		readTime: "Время чтения",
		minutesShort: "мин",
		previous: "Назад",
		next: "Вперёд",
		loadingProfile: "Профиль загружается",
		preparingPage: "Подготовка страницы",
		noItemsYet: "Пока нечего показывать.",
		noDescriptionYet: "Описание профиля пока отсутствует.",
		percentComplete: (progress: number) => `${progress}% завершено`,
	},
	language: {
		...dictionaries.en.language,
		label: "Язык",
		ariaLabel: "Изменить язык сайта",
		menuTitle: "Выбрать язык",
	},
	header: {
		...dictionaries.en.header,
		eyebrow: "Личный блог о разработке",
		description:
			"Туториалы, мнения, заметки по фронтенду и интерактивные сайд-проекты в одном месте.",
		suggestTitle: "Предложить пост (требуется проверка)",
		homeAria: "Главная",
	},
	nav: {
		...dictionaries.en.nav,
		navigation: "Навигация",
		openMenu: "Открыть меню навигации",
		closeMenu: "Закрыть меню навигации",
	},
	footer: {
		...dictionaries.en.footer,
		title: "Посты, эксперименты, работа над интерфейсом.",
		description:
			"Личный блог о разработке с текстами, исследованиями взаимодействия и песочницей для идей, которые проще показать, чем описать.",
		navigate: "Навигация",
		socials: "Соцсети",
		closing: "Статьи, UI-эксперименты и интерактивные побочные проекты.",
	},
	popover: {
		...dictionaries.en.popover,
		aria: "Действия с постом",
		save: "Сохранить в закладки",
		share: "Поделиться",
		moreLikeThis: "Больше постов как этот",
		lessLikeThis: "Меньше постов как этот",
	},
	home: {
		...dictionaries.en.home,
		startHere: "Начните здесь",
		title: "Личный блог о разработке с пространством для исследования",
		description:
			"DevBlog это место, где я публикую тексты о разработке, мнения, туториалы и эксперименты. Главная страница выделяет важные материалы, то, что сейчас в тренде, и быстрые пути к остальным разделам блога.",
		featuredPosts: "Избранные посты",
		trendingPicks: "Трендовые подборки",
		recommended: "Рекомендуемое",
		trendingSnapshot: "Снимок трендов",
		trendingTitle: "Что сейчас получает внимание",
		trendingDescription:
			"Быстрый обзор постов, которые прямо сейчас привлекают читателей, в том же месте, но с более чёткой структурой разделов.",
		exploreFurther: "Исследовать дальше",
		exploreTitle: "Больше путей в блог",
		exploreDescription:
			"Используйте эти разделы, чтобы переключаться между новым, популярным и тем, к чему стоит вернуться.",
		editorPicks: "Выбор редактора",
		noRecommended:
			"Рекомендованных постов пока нет. Опубликуйте несколько записей, и этот раздел заполнится из живой базы данных.",
		noPosts:
			"Опубликованных постов пока нет. Главная уже подключена к Prisma, поэтому разделы заполнятся сразу после появления реальных постов.",
		scrollToTrending: "Прокрутить к трендовым постам",
		noTrending:
			"Трендовых постов пока нет. Как только опубликованные посты начнут набирать просмотры, они появятся здесь автоматически.",
		explore: "Исследовать",
		trendingPosts: "Трендовые посты",
		trendingPostsDescription:
			"Посмотрите, что привлекает больше всего внимания прямо сейчас.",
		recentPosts: "Недавние посты",
		recentPostsDescription:
			"Начните с самых свежих текстов и двигайтесь назад.",
		browseByTag: "Поиск по тегам",
		browseByTagDescription:
			"Фильтруйте живой каталог постов по темам и дополнительным тегам.",
		noSectionPost: "Для этого раздела пока нет доступных постов.",
		noRecommendedCallouts:
			"Рекомендованные карточки появятся здесь после публикации большего числа постов.",
		viewSection: "Открыть раздел",
	},
	notFound: {
		...dictionaries.en.notFound,
		description: "Страница, которую вы ищете, не найдена.",
		backHome: "Вернуться на главную",
	},
	searchBar: {
		...dictionaries.en.searchBar,
		placeholder: "Искать посты",
		ariaLabel: "Искать посты",
		openSearch: "Открыть поиск",
		searchSuggestions: "Подсказки поиска",
		viewAllResults: "Показать все результаты",
	},
	suggestModal: {
		...dictionaries.en.suggestModal,
		title: "Предложить пост",
		close: "Закрыть окно предложения поста",
		fieldTitle: "Заголовок",
		titlePlaceholder: "например: Понимание React Server Components в Next 14",
		fieldIdea: "В чём идея?",
		ideaPlaceholder:
			"Добавьте краткий план, пункты или ссылки для контекста (необязательно).",
		reviewNote:
			"Ваше предложение будет проверено перед публикацией. Пожалуйста, избегайте чувствительных данных и личной информации.",
		submitted: "Отправлено!",
		submitting: "Отправка...",
		submit: "Отправить предложение",
		titleTooShort: (min: number) =>
			`Заголовок должен содержать минимум ${min} символов.`,
		maxChars: (max: number) => `Максимум ${max} символов.`,
	},
	about: {
		...dictionaries.en.about,
		eyebrow: "О devblog",
		title: "Место, чтобы писать, экспериментировать и продолжать выпускать",
		description:
			"Этот сайт это место, где тексты, работа над интерфейсами и побочные эксперименты живут в одной рамке. Он должен оставаться полезным, личным и живым, а не превращаться в статичный архив-портфолио.",
		storyCards: [
			{
				label: "Зачем он существует",
				title: "Блог, которым я действительно продолжаю пользоваться",
				text: "DevBlog это мой личный блог о разработке программного обеспечения. Здесь я публикую туториалы, мнения, эксперименты, идеи интерфейсов и те части веб-разработки, которые мне особенно нравится доводить до ума.",
			},
			{
				label: "Как он построен",
				title: "Практичный стек с местом для визуальной работы",
				text: "Стек построен вокруг Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser и нескольких вспомогательных библиотек для работы с данными и экспериментов. Цель в том, чтобы проект оставался практичным, простым и приятным в разработке, не теряя визуальную сторону работы.",
			},
			{
				label: "Что ещё здесь живёт",
				title: "Игровые инструменты, наброски и побочные идеи",
				text: "Помимо постов, сайт опирается на интерактивность: поиск по тегам, рекомендации, инструменты для пользователей и песочницу, полную игр и набросков. Я не разработчик игр, но песочница хорошо подходит для хобби-проектов и ещё одного способа показать, что я могу построить.",
			},
		],
	},
	playgroundPage: {
		...dictionaries.en.playgroundPage,
		title: "Игры, наброски и интерактивные обходные тропы",
		description:
			"Эта страница служит домом для хобби-экспериментов. Я в первую очередь веб-разработчик, а не разработчик игр, но эти небольшие проекты помогают исследовать взаимодействие, движение и идеи рендеринга в браузере.",
		totalProjects: "Всего проектов",
		projects: "Проекты",
		playableTitle: "Играбельные",
		playableDescription:
			"Практические эксперименты, которыми можно управлять напрямую, от игр до небольших систем.",
		watchOnlyTitle: "Только смотреть",
		watchOnlyDescription:
			"Визуальные работы, которые лучше воспринимать как исследования движения, а не как игры с очками.",
		mode: "Режим",
		loading: "Загрузка...",
		closeGame: "Закрыть игру",
		badges: {
			playable: "Играбельно",
			watchOnly: "Только смотреть",
		},
		games: {
			chess: { name: "Chess", description: "Классическая шахматная игра" },
			snakeGame: {
				name: "Snake Game",
				description: "Классическая игра в змейку",
			},
			minesweeper: {
				name: "Minesweeper",
				description: "Сапёр",
			},
			antSimulator: {
				name: "Ant Simulator",
				description: "Гонка муравьиных колоний",
			},
			solarSystem: {
				name: "Solar System",
				description: "Планетарный танец",
			},
			terminal: { name: "Terminal", description: "Терминал Linux" },
			tankShooter: {
				name: "Tank Shooter",
				description: "Танковый шутер",
			},
			fallingSand: {
				name: "Falling Sand",
				description: "Падающий песок",
			},
			movingMountains: {
				name: "Moving Mountains",
				description: "Движущиеся горы",
			},
			survivalShooter: {
				name: "Survival Shooter",
				description: "Шутер на выживание",
			},
			tetris: { name: "Tetris", description: "Tetris" },
			binaryPong: {
				name: "Binary Pong",
				description: "Бинарный понг",
			},
			sineWaves: {
				name: "Sine Waves",
				description: "Синусоидальные волны",
			},
			voronoiWall: {
				name: "Voronoi Wall",
				description: "Стена Вороного",
			},
			"2048": { name: "2048", description: "2048" },
			pacman: { name: "Pacman", description: "Pacman" },
			newtonCannon: {
				name: "Newton Cannon",
				description: "Пушка Ньютона",
			},
			flappyBird: {
				name: "Flappy Bird",
				description: "Flappy Bird",
			},
			labyrinthExplorer: {
				name: "Labyrinth Explorer",
				description: "Исследователь лабиринта",
			},
		},
	},
	recent: {
		...dictionaries.en.recent,
		eyebrow: "Последние посты",
		title: "Самые новые посты по порядку",
		description:
			"Эта страница это самый понятный вид блога в порядке публикации. Она держит новые тексты на первом плане, а пагинация и тематические подсказки остаются рядом.",
		postCount: "Количество постов",
		currentPage: "Текущая страница",
		totalViews: "Всего просмотров",
		latestArrival: "Последнее поступление",
		noPublished:
			"Опубликованных постов пока нет. Создайте первый пост, и он появится здесь как самое свежее поступление.",
		readingGuide: "Гид по чтению",
		stayOriented: "Не теряйте ориентир",
		stayOrientedDescription:
			"Листайте блог страницу за страницей, следите за самым новым материалом и переходите к темам, которые чаще всего встречаются в последней подборке постов.",
		showingNow: "Сейчас показано",
		pageControls: "Управление страницами",
		freshTopics: "Свежие темы",
		topicCountsLater: "Счётчики тем появятся здесь после публикации постов.",
		recentPosts: "Недавние посты",
		recentPostsTitle: "Самые новые записи на devblog",
		recentPostsDescription:
			"Строго отсортировано по дате публикации, чтобы страница работала как настоящая лента новых постов.",
		noPosts:
			"Постов пока нет. Эта страница теперь читает данные напрямую из базы и заполнится, как только появятся опубликованные записи.",
		noPublishedShort: "Опубликованных постов пока нет",
		relatedTags: (count: number) =>
			`${count} связанных ${count === 1 ? "тега" : "тегов"}`,
		visibleRange: (start: number, end: number, total: number) =>
			`Посты ${start}-${end} из ${total}`,
		pageOf: (page: number, total: number) => `Страница ${page} из ${total}`,
	},
	trending: {
		...dictionaries.en.trending,
		eyebrow: "Сейчас в тренде",
		title: "На что читатели обращают внимание",
		description:
			"Аккордеон остаётся фирменной частью страницы, но теперь остальной интерфейс поддерживает его: ранжированные посты, заметные тематические сигналы и более понятные причины, почему пост находится вверху.",
		trackedPosts: "Отслеживаемые посты",
		topPost: "Топ-пост",
		totalViews: "Всего просмотров",
		noTrending:
			"Трендовых постов пока нет. Этот раздел заполнится, когда опубликованные посты начнут набирать просмотры.",
		trendSignals: "Сигналы тренда",
		topicRadar: "Радар тем",
		topicRadarDescription:
			"Основные темы с самым сильным присутствием в текущей трендовой подборке. Используйте их, чтобы переходить к связанным постам, не теряя контекст того, что сейчас горячо.",
		topicSignalsLater:
			"Тематические сигналы появятся здесь после публикации постов.",
		leadingPost: "Лидирующий пост",
		leadingPostEmpty:
			"Лидера трендов пока нет. Публикуйте посты и накапливайте просмотры, чтобы сформировать этот рейтинг.",
		ranking: "Рейтинг",
		topMomentum: "Топ-посты по импульсу",
		topMomentumDescription:
			"Самые читаемые посты прямо сейчас, отсортированные по просмотрам, чтобы список действительно отражал тренд.",
		moreToWatch: "Ещё стоит посмотреть",
		risingPosts: "Растущие посты",
		risingPostsDescription:
			"Посты чуть ниже верхнего уровня, которые всё равно заслуживают ясного и читаемого представления.",
		notEnoughPosts: "Пока недостаточно постов для второго списка с акцентом.",
		readPost: "Читать пост",
		focusPost: (title: string) => `Фокус на ${title}`,
		viewsSuffix: (count: string) => `${count} просмотров`,
	},
	search: {
		...dictionaries.en.search,
		eyebrow: "Поиск постов",
		description:
			"Ищите подходящие посты по всему devblog. Результаты используют те же карточки, что и остальная часть сайта, с пагинацией для длинных запросов.",
		matches: "Совпадения",
		noMatch: "Нет совпадений",
		nothingFound: (query: string) => `По запросу "${query}" ничего не найдено.`,
		noMatchDescription:
			"Попробуйте более короткий запрос, ищите по тегу или автору либо перейдите к последним постам.",
		seeRecentPosts: "Посмотреть последние посты",
		resultsFor: (query: string) => `Результаты для "${query}"`,
	},
	tag: {
		...dictionaries.en.tag,
		eyebrow: "Поиск по тегам",
		title: "Открывайте посты по темам",
		description:
			"Используйте теги, чтобы быстро сузить блог. Выберите основную тему, добавьте несколько вспомогательных тегов и держите сетку результатов перед глазами, пока уточняете выбор.",
		totalTags: "Всего тегов",
		selected: "Выбрано",
		visiblePosts: "Видимые посты",
		mainTopics: "Основные темы",
		mainTopicsDescription: "Широкие категории, которые формируют каждый пост.",
		supportingTags: "Дополнительные теги",
		supportingTagsDescription:
			"Используйте их, чтобы сузить сетку, не теряя контекст.",
		noPostsYet: "Постов пока нет",
		unlockAfterFirstPost:
			"Просмотр по тегам откроется после первого опубликованного поста",
		tagBrowsingDescription:
			"Страница тегов теперь читает реальные данные из базы, поэтому она останется пустой, пока не появятся опубликованные посты и теги.",
		noMatches: "Нет совпадений",
		noPostsFit: "Нет постов под это сочетание",
		noPostsFitDescription:
			"Попробуйте убрать один из активных тегов или переключиться на более широкую основную тему. Быстрые подборки в панели фильтров хороший способ сброса.",
		viewsSuffix: (count: string) => `${count} просмотров`,
		filterPosts: "Фильтровать посты",
		findTopic: "Найти тему",
		filterDescription: (max: number) =>
			`Ищите теги, комбинируйте до ${max} и сужайте сетку постов, не покидая страницу.`,
		searchTags: "Искать теги",
		selectedTags: "Выбранные теги",
		selectedTagsHint:
			"Добавьте ещё один тег для более точной выборки или сбросьте фильтры, чтобы расширить результаты.",
		selectedTagsEmpty:
			"Начните с широкой темы, затем добавьте вспомогательные теги, если нужно сфокусировать результаты.",
		clearFilters: "Очистить фильтры",
		quickPicks: "Быстрые подборки",
		quickPicksDescription:
			"Популярные теги, которые быстро открывают страницу.",
		tagGroupMainDescription: "Основные категории, определяющие пост.",
		tagGroupOtherDescription: "Вторичные детали и связанные темы.",
		noTagsMatch: "Ни один тег не соответствует текущему поиску.",
		resultsSummary: (resultsCount: number, tagCount: number) =>
			`${resultsCount} ${resultsCount === 1 ? "пост" : "постов"} по ${tagCount} ${tagCount === 1 ? "тегу" : "тегам"}`,
		showingAll: (resultsCount: number) =>
			`Показаны все ${resultsCount} ${resultsCount === 1 ? "пост" : "постов"}`,
		resultsDescription:
			"Уберите тег, чтобы расширить результаты, или продолжайте комбинировать связанные темы, чтобы оставаться сфокусированным.",
		resultsDescriptionEmpty:
			"Используйте быстрые подборки, заметные ряды или панель фильтров, чтобы углубиться в конкретную тему.",
		resetAll: "Сбросить всё",
		removeTag: (label: string) => `Убрать ${label}`,
		noActiveFilters: "Нет активных фильтров по тегам.",
	},
	login: {
		...dictionaries.en.login,
		eyebrow: "Доступ для участников",
		title: "Вход",
		email: "Электронная почта",
		password: "Пароль",
		hidePassword: "Скрыть пароль",
		showPassword: "Показать пароль",
		continue: "Продолжить",
		noAccount: "Нет аккаунта?",
		register: "Регистрация",
		invalidCredentials: "Неверный email или пароль.",
		unableToLogin: "Сейчас не удаётся войти.",
	},
	register: {
		...dictionaries.en.register,
		eyebrow: "Создать доступ",
		title: "Регистрация",
		name: "Имя",
		email: "Электронная почта",
		password: "Пароль",
		confirmPassword: "Подтвердите пароль",
		hidePassword: "Скрыть пароль",
		showPassword: "Показать пароль",
		createAccount: "Создать аккаунт",
		haveAccount: "Уже есть аккаунт?",
		login: "Войти",
		unableToCreate: "Сейчас не удаётся создать аккаунт.",
		accountCreatedLoginFailed:
			"Аккаунт создан, но автоматический вход не удался.",
		unableToCreateShort: "Не удалось создать аккаунт.",
	},
	profile: {
		...dictionaries.en.profile,
		overview: "Обзор профиля",
		yourProfile: "Ваш профиль",
		description:
			"Реальные данные аккаунта теперь поддерживаются базой данных, включая роль, подключённые провайдеры, сохранённые поля профиля и живые счётчики активности.",
		loadingTitle: "Подготовка страницы",
		unavailable: "Профиль недоступен",
		goToLogin: "Перейти ко входу",
		bookmarks: "Закладки",
		viewedPosts: "Просмотренные посты",
		comments: "Комментарии",
		handle: "Хэндл",
		email: "Электронная почта",
		role: "Роль",
		passwordLogin: "Вход по паролю",
		configured: "Настроено",
		notSet: "Не задано",
		connectedAccounts: "Подключённые аккаунты",
		credentialsOnly: "Только учётные данные",
		editProfile: "Редактировать профиль",
		logout: "Выйти",
		profileAlt: (name: string) => `Профиль ${name}`,
		recentActivity: "Недавняя активность по всему блогу",
		noCommentsYet: "Комментариев пока нет.",
		editedOn: (date: string) => `Изменено ${date}`,
		itemCount: (count: number) =>
			`${count} ${count === 1 ? "элемент" : "элементов"}`,
		loadLoginRequired: "Пожалуйста, войдите, чтобы открыть профиль.",
		loadNotFound: "Этот профиль не найден.",
		loadError: "Сейчас не удаётся загрузить этот профиль.",
		saveError: "Не удалось сохранить профиль.",
	},
	profileEdit: {
		...dictionaries.en.profileEdit,
		settingsEyebrow: "Настройки профиля",
		title: "Редактировать профиль",
		closeModal: "Закрыть окно редактирования профиля",
		preview: "Предпросмотр",
		previewAlt: "Предпросмотр профиля",
		providerAvailable: "Фото провайдера доступно",
		providerMissing: "Фото провайдера отсутствует",
		providerPhoto: "Фото провайдера",
		generatedAvatar: "Сгенерированный аватар",
		uploadPhoto: "Загрузить фото",
		uploadHint: "JPG, PNG или WEBP до 2 МБ.",
		uploadedImageLabel: "Загруженное изображение",
		uploaded: (name: string) => `Загружено: ${name}`,
		displayName: "Отображаемое имя",
		profileUrl: (handle: string) => `URL профиля: \`/profile/${handle}\``,
		description: "Описание",
		changePassword: "Изменить пароль",
		createPassword: "Создать пароль",
		changePasswordDescription:
			"Обновите пароль для входа по email, не теряя социальный вход.",
		createPasswordDescription:
			"Добавьте пароль для входа по email к этому социальному аккаунту.",
		optional: "Необязательно",
		currentPassword: "Текущий пароль",
		newPassword: "Новый пароль",
		confirmNewPassword: "Подтвердите новый пароль",
		save: "Сохранить профиль",
		saving: "Сохранение...",
	},
	profileValidation: {
		...dictionaries.en.profileValidation,
		nameRequired: "Имя обязательно.",
		maxChars: (max: number) => `Максимум ${max} символов.`,
		handleRequired: "Хэндл обязателен.",
		handleLettersNumbersOnly: "Используйте только буквы и цифры.",
		handleMin: (min: number) =>
			`Хэндл должен содержать минимум ${min} символов.`,
		handleMax: (max: number) =>
			`Хэндл должен содержать не более ${max} символов.`,
		uploadRequired: "Загрузите изображение JPG, PNG или WEBP.",
		uploadAllowed: "Разрешены только изображения JPG, PNG или WEBP.",
		uploadMaxSize: "Максимальный размер изображения 2 МБ.",
		invalidProviderUrl: (provider: string) =>
			`Некорректный URL для ${provider}.`,
		currentPasswordIncorrect: "Текущий пароль неверный.",
		handleTaken: "Этот хэндл уже занят.",
		unableToSave: "Не удалось сохранить профиль.",
	},
	newPost: {
		...dictionaries.en.newPost,
		createPageEyebrow: "Новый пост",
		createPageTitle: "Создайте статью, готовую к публикации",
		createPageDescription:
			"Пишите реальный markdown, прикрепляйте реальные медиа и сохраняйте прямо в backend, чтобы страница поста рендерила тот же самый контент.",
		accessRequiredTitle: "Требуется доступ автора",
		accessRequiredDescription:
			"Эта страница предназначена для аккаунтов авторов. Войдите с профилем, у которого есть права на создание, чтобы писать черновики, отправлять на проверку и публиковать посты.",
		editPageEyebrow: "Редактировать пост",
		editPageTitle: "Обновить статью",
		editPageDescription:
			"Уточняйте метаданные, содержимое или медиа и сохраняйте напрямую в ту же запись поста.",
		editAccessDeniedTitle: "Доступ запрещён",
		editAccessDeniedDescription:
			"Редактировать этот пост может только автор или администраторы сайта.",
		role: "Роль",
		author: "Автор",
		defaultAuthor: "Автор",
		mode: "Режим",
		modeCreating: "Создание",
		modeEditing: "Редактирование",
		editorEyebrowCreate: "Новый пост",
		editorEyebrowEdit: "Редактировать пост",
		editorTitleCreate: "Соберите пост до публикации",
		editorTitleEdit: "Уточните опубликованную форму",
		editorDescription:
			"Редактор сохраняет реальный markdown, реальные пути к медиа и реальные метаданные поста в Prisma. То, что вы видите здесь, будет отрисовано на странице поста.",
		storySetupEyebrow: "Настройка материала",
		storySetupTitle: "Сначала зафиксируйте метаданные",
		title: "Заголовок",
		titlePlaceholder: "Заголовок, достойный клика",
		slug: "Slug",
		slugPlaceholder: "slug-url-posta",
		regenerate: "Сгенерировать заново",
		finalUrl: (slug: string) => `Итоговый URL: /post/${slug}`,
		description: "Описание",
		generateFromContent: "Сгенерировать из контента",
		descriptionPlaceholder: "Что читатель должен понять до открытия статьи?",
		visualsEyebrow: "Визуал",
		visualsTitle: "Задайте миниатюру поста",
		thumbnail: "Миниатюра",
		thumbnailDescription:
			"Она определяет hero-изображение на странице поста и миниатюру карточки в остальных местах сайта.",
		upload: "Загрузить",
		uploading: "Загрузка...",
		thumbnailPreviewAlt: "Миниатюра поста",
		thumbnailEmpty:
			"Загрузите изображение, которое должно представлять этот пост.",
		thumbnailUploaded: "Миниатюра загружена.",
		thumbnailUploadError: "Не удалось загрузить миниатюру.",
		thumbnailAlt: "Alt-текст миниатюры",
		thumbnailAltPlaceholder:
			"Опишите миниатюру для доступности и предпросмотров",
		bodyEyebrow: "Тело",
		bodyTitle: "Пишите и проверяйте в одном месте",
		bodyDescription:
			"Пишите в markdown, загружайте встроенные изображения и проверяйте итоговый рендер перед сохранением.",
		readTime: "Время чтения",
		taxonomyEyebrow: "Таксономия",
		taxonomyTitle: "Разместите статью",
		mainTag: "Основной тег",
		tags: "Теги",
		readinessEyebrow: "Готовность",
		readinessTitle: "Проверьте главное",
		checklistTitleSet: "Заголовок задан",
		checklistThumbnailUploaded: "Миниатюра загружена",
		checklistMainTagChosen: "Основной тег выбран",
		checklistSupportingTagsAdded: "Дополнительные теги добавлены",
		checklistDescriptionReady: "Описание готово",
		checklistBodyHasSubstance: "Текст достаточно содержательный",
		ready: "Готово",
		missing: "Отсутствует",
		wordCount: (count: number) => `${count} слов`,
		tagCount: (count: number) =>
			`${count} ${count === 1 ? "тег" : "тегов"} прикреплено`,
		currentTarget: (status: string) => `Текущая цель: ${status}`,
		publishEyebrow: "Публикация",
		publishTitle: "Выберите следующий шаг",
		statusDraftLabel: "Сохранить черновик",
		statusDraftDescription:
			"Держите пост приватным, пока дорабатываете содержимое.",
		statusPendingReviewLabel: "Отправить на проверку",
		statusPendingReviewDescription:
			"Пометьте черновик как готовый к редакторской проверке.",
		statusPublishedLabel: "Опубликовать сейчас",
		statusPublishedDescription: "Сделать пост видимым на сайте немедленно.",
		saving: "Сохранение...",
		clearForm: "Очистить форму",
		submitError: "Сейчас не удаётся сохранить пост. Попробуйте ещё раз.",
		submitSuccessPublished: "Пост опубликован.",
		submitSuccessReview: "Пост отправлен на проверку.",
		submitSuccessDraft: "Черновик сохранён.",
		mainTagPlaceholder:
			"Выберите существующую тему или задайте новый основной тег",
		mainTagHelp: "Основные теги группируют пост в списках и рекомендациях.",
		tagsPlaceholder: "Добавьте теги и нажмите Enter",
		tagsLimitReached: "Достигнут лимит тегов",
		tagSlotsLeft: (count: number) =>
			`Осталось ${count} мест для тегов. Используйте точные и удобные для поиска метки.`,
		editorControlsEyebrow: "Управление редактором",
		editorControlsTitle: "Формируйте markdown осознанно",
		editorControlsDescription:
			"Встроенные изображения остаются там, где вы их вставили, и рендерятся по центру как в предпросмотре, так и в финальном посте.",
		modeWrite: "Писать",
		modeWriteDescription: "Сфокусироваться на markdown.",
		modePreview: "Предпросмотр",
		modePreviewDescription: "Посмотреть итоговый рендер.",
		modeSplit: "Разделить",
		modeSplitDescription: "Писать и смотреть одновременно.",
		toolbarInline: "В строке",
		toolbarBlocks: "Блоки",
		toolbarBold: "Жирный",
		toolbarItalic: "Курсив",
		toolbarCode: "Код",
		toolbarLink: "Ссылка",
		toolbarCodeBlock: "Блок кода",
		toolbarHeading: "Заголовок",
		toolbarQuote: "Цитата",
		toolbarList: "Список",
		toolbarNumbered: "Нумерованный",
		toolbarDivider: "Разделитель",
		insertImage: "Вставить изображение",
		dualPanel: "Две панели",
		modeBadge: (mode: string) => `Режим ${mode}`,
		markdownEyebrow: "Markdown",
		markdownDescription:
			"Пишите на чистом markdown и сохраняйте контроль над тем, где оказывается каждый блок и каждое изображение.",
		editableSource: "Редактируемый исходник",
		markdownPlaceholder:
			"Пишите статью в Markdown.\n\nПример:\n## Заголовок раздела\n\nАбзац с **выделением** и [ссылкой](https://example.com).\n",
		previewEyebrow: "Предпросмотр",
		previewDescription:
			"Предпросмотр использует тот же рендерер, что и опубликованная страница поста.",
		finalRendering: "Финальный рендер",
		emptyPreview: "Начните писать, чтобы увидеть финальный рендер поста.",
		editorWordCount: (count: number) => `${count} слов`,
		editorReadTime: (count: number) => `${count} мин чтения`,
		editorCharacters: (used: number, max: number) => `${used}/${max} символов`,
		imagesInserted: (count: number) =>
			`${count} ${count === 1 ? "изображение вставлено" : "изображений вставлено"} в markdown.`,
		imageDefaultAlt: "Изображение",
		imageUploadError: "Не удалось загрузить изображение.",
		progressAria: (progress: number, remaining: number) =>
			`${progress}% прогресса, осталось ${remaining} мин.`,
	},
	postValidation: {
		...dictionaries.en.postValidation,
		imageRequired: "Изображение обязательно.",
		imageInvalid:
			"Изображение должно быть путём к загруженному файлу или корректным URL.",
		tagEmpty: "Теги не могут быть пустыми.",
		tagMaxLength: (max: number) =>
			`Теги должны содержать не более ${max} символов.`,
		titleMin: "Заголовок должен содержать минимум 3 символа.",
		titleMax: (max: number) =>
			`Заголовок должен содержать не более ${max} символов.`,
		slugMax: (max: number) => `Slug должен содержать не более ${max} символов.`,
		slugInvalid: "Slug может содержать только строчные буквы, цифры и дефисы.",
		contentMin: "Контент должен содержать минимум 30 символов.",
		contentMax: (max: number) =>
			`Контент должен содержать не более ${max} символов.`,
		thumbnailAltMax: (max: number) =>
			`Alt-текст миниатюры должен содержать не более ${max} символов.`,
		mainTagRequired: "Основной тег обязателен.",
		tagsRequired: "Требуется хотя бы один тег.",
		tagsMaxItems: (max: number) =>
			`Теги должны содержать не более ${max} элементов.`,
		tagsUnique: "Теги должны быть уникальными.",
		descriptionMax: (max: number) =>
			`Описание должно содержать не более ${max} символов.`,
	},
	post: {
		...dictionaries.en.post,
		relatedReading: "Связанное чтение",
		moreFromThisLane: "Ещё из этого направления",
		statusPublished: "Опубликовано",
		statusPendingReview: "На проверке",
		statusDraft: "Черновик",
		writtenBy: "Автор",
		editPost: "Редактировать пост",
		edit: "Изменить",
		authorProfile: "Профиль автора",
		moreIn: (tag: string) => `Ещё в ${tag}`,
		authorDescription: (
			name: string,
			mainTag: string,
			relatedTopics: string[],
		) =>
			relatedTopics.length > 0
				? `${name} пишет вокруг ${mainTag}, регулярно возвращаясь к темам ${relatedTopics.join(" и ")}.`
				: `${name} пишет вокруг ${mainTag}.`,
		commentSection: "Раздел комментариев",
		commentPlaceholder: "Добавьте комментарий",
		commentAs: (name: string) => `Комментируете как ${name}`,
		loginRequiredToComment: "Для комментария нужен вход",
		comment: "Комментировать",
		postedOn: (date: string) => `Опубликовано ${date}`,
		reportComment: "Пожаловаться на комментарий",
		loginModalTitle: "Для этого нужно войти в систему.",
		loginModalDescription:
			"После входа пользоваться сайтом удобнее. Присоединяйтесь к разговору.",
		reportCommentTitle: "Пожаловаться на комментарий",
		reportingCommentBy: (author: string) =>
			`Жалоба на комментарий автора ${author}:`,
		reason: "Причина",
		chooseReason: "Выберите причину...",
		details: "Детали",
		detailsOptional: "Детали (необязательно)",
		detailsMin: (min: number) => `Детали (мин. ${min} символов)`,
		describeIssue: "Опишите проблему...",
		addContext: "Добавьте контекст (необязательно)...",
		submitReport: "Отправить жалобу",
		submitting: "Отправка...",
		reportValidation: "Пожалуйста, заполните все обязательные поля.",
	},
	authValidation: {
		...dictionaries.en.authValidation,
		emailRequired: "Email обязателен.",
		emailInvalid: "Введите корректный email.",
		passwordTooLong: (max: number) =>
			`Пароль должен содержать не более ${max} символов.`,
		passwordRequired: "Пароль обязателен.",
		passwordTooShort: "Пароль должен содержать минимум 8 символов.",
		nameTooShort: "Имя должно содержать минимум 2 символа.",
		nameTooLong: "Имя должно содержать не более 60 символов.",
		confirmPasswordRequired: "Пожалуйста, подтвердите пароль.",
		passwordsDoNotMatch: "Пароли не совпадают.",
		currentPasswordRequired: "Текущий пароль обязателен.",
		newPasswordRequired: "Новый пароль обязателен.",
		confirmNewPasswordRequired: "Пожалуйста, подтвердите новый пароль.",
	},
} as unknown as typeof dictionaries.en;

const frenchMessages = {
	...dictionaries.en,
	common: {
		...dictionaries.en.common,
		home: "Accueil",
		recent: "Récent",
		trending: "Tendance",
		tags: "Étiquettes",
		about: "À propos",
		playground: "Laboratoire",
		profile: "Profil",
		create: "Créer",
		suggest: "Suggérer",
		login: "Connexion",
		logout: "Déconnexion",
		search: "Rechercher",
		close: "Fermer",
		cancel: "Annuler",
		results: "Résultats",
		page: "Page",
		views: "Vues",
		bookmarks: "Favoris",
		comments: "Commentaires",
		author: "Auteur",
		edited: "Modifié",
		published: "Publié",
		lastSaved: "Dernière sauvegarde",
		readTime: "Temps de lecture",
		minutesShort: "min",
		previous: "Précédent",
		next: "Suivant",
		loadingProfile: "Chargement du profil",
		preparingPage: "Préparation de la page",
		noItemsYet: "Aucun élément à afficher pour le moment.",
		noDescriptionYet: "Aucune description de profil pour le moment.",
		percentComplete: (progress: number) => `${progress}% terminé`,
	},
	language: {
		...dictionaries.en.language,
		label: "Langue",
		ariaLabel: "Changer la langue du site",
		menuTitle: "Choisir la langue",
	},
	header: {
		...dictionaries.en.header,
		eyebrow: "Blog perso de développement",
		description:
			"Tutoriels, opinions, notes frontend et projets interactifs réunis au même endroit.",
		suggestTitle: "Suggérer un article (avec relecture)",
		homeAria: "Accueil",
	},
	nav: {
		...dictionaries.en.nav,
		navigation: "Navigation",
		openMenu: "Ouvrir le menu de navigation",
		closeMenu: "Fermer le menu de navigation",
	},
	footer: {
		...dictionaries.en.footer,
		title: "Articles, expériences, travail d'interface.",
		description:
			"Un blog personnel de développement avec des textes, des études d'interaction et un playground pour les idées plus faciles à montrer qu'à décrire.",
		navigate: "Naviguer",
		socials: "Réseaux",
		closing: "Articles, expériences UI et projets interactifs secondaires.",
	},
	popover: {
		...dictionaries.en.popover,
		aria: "Actions du post",
		save: "Enregistrer dans les favoris",
		share: "Partager",
		moreLikeThis: "Plus d'articles comme celui-ci",
		lessLikeThis: "Moins d'articles comme celui-ci",
	},
	home: {
		startHere: "Commencer ici",
		title: "Un blog de développement personnel avec de la place pour explorer",
		description:
			"DevBlog est l'endroit où je publie des écrits sur le développement, des opinions, des tutoriels et des expériences. La page d'accueil met en avant les lectures phares, ce qui attire l'attention en ce moment et des chemins rapides vers le reste du blog.",
		featuredPosts: "Articles à la une",
		trendingPicks: "Sélection tendance",
		recommended: "Recommandés",
		trendingSnapshot: "Aperçu tendance",
		trendingTitle: "Ce qui attire l'attention maintenant",
		trendingDescription:
			"Un aperçu rapide des articles qui attirent les lecteurs en ce moment, avec une structure de section plus claire.",
		exploreFurther: "Aller plus loin",
		exploreTitle: "Plus de portes d'entrée dans le blog",
		exploreDescription:
			"Utilisez ces sections pour passer de ce qui est nouveau à ce qui attire l'attention, puis aux articles à revisiter.",
		editorPicks: "Choix de l'éditeur",
		noRecommended:
			"Aucun article recommandé pour le moment. Publiez quelques entrées et cette section se remplira automatiquement à partir de la base de données active.",
		noPosts:
			"Aucun article n'est encore publié. La page d'accueil est maintenant connectée à Prisma, donc les sections se rempliront dès que de vrais articles existeront.",
		scrollToTrending: "Faire défiler jusqu'aux articles tendance",
		noTrending:
			"Aucun article tendance pour le moment. Dès que les articles publiés commenceront à accumuler des vues, ils apparaîtront ici automatiquement.",
		explore: "Explorer",
		trendingPosts: "Articles tendance",
		trendingPostsDescription:
			"Découvrez ce qui attire le plus l'attention en ce moment.",
		recentPosts: "Articles récents",
		recentPostsDescription:
			"Commencez par les textes les plus récents puis remontez à partir de là.",
		browseByTag: "Parcourir par tag",
		browseByTagDescription:
			"Filtrez le catalogue d'articles en direct par sujet et par tags secondaires.",
		noSectionPost: "Aucun article n'est encore disponible pour cette section.",
		noRecommendedCallouts:
			"Les encarts recommandés apparaîtront ici après la publication de davantage d'articles.",
		viewSection: "Voir la section",
	},
	notFound: {
		...dictionaries.en.notFound,
		description: "La page que vous recherchez est introuvable.",
		backHome: "Retour à l'accueil",
	},
	searchBar: {
		...dictionaries.en.searchBar,
		placeholder: "Rechercher des articles",
		ariaLabel: "Rechercher des articles",
		openSearch: "Ouvrir la recherche",
		searchSuggestions: "Suggestions de recherche",
		viewAllResults: "Voir tous les résultats",
	},
	suggestModal: {
		...dictionaries.en.suggestModal,
		title: "Suggérer un article",
		close: "Fermer la fenêtre de suggestion",
		fieldTitle: "Titre",
		titlePlaceholder: "ex. Comprendre les React Server Components dans Next 14",
		fieldIdea: "Quelle est l'idée ?",
		ideaPlaceholder:
			"Ajoutez un court plan, quelques points clés ou des liens de contexte (optionnel).",
		reviewNote:
			"Votre suggestion sera relue avant publication. Merci d'éviter les données sensibles ou personnelles.",
		submitted: "Envoyé !",
		submitting: "Envoi...",
		submit: "Envoyer la suggestion",
		titleTooShort: (min: number) =>
			`Le titre doit contenir au moins ${min} caractères.`,
		maxChars: (max: number) => `Maximum ${max} caractères.`,
	},
	about: {
		...dictionaries.en.about,
		eyebrow: "À propos de devblog",
		title: "Un endroit pour écrire, expérimenter et continuer à publier",
		description:
			"Ce site rassemble écriture, travail d'interface et expériences parallèles dans un même cadre. L'idée est de rester utile, personnel et vivant au lieu de devenir un simple portfolio figé.",
		storyCards: [
			{
				label: "Pourquoi il existe",
				title: "Un blog que j'utilise vraiment",
				text: "DevBlog est mon blog personnel sur le développement logiciel. J'y publie des tutoriels, des opinions, des expériences, des idées d'interface et les aspects du développement web que j'aime le plus affiner.",
			},
			{
				label: "Comment il est construit",
				title: "Une stack pratique avec de la place pour le visuel",
				text: "La stack s'appuie sur Next.js, React, Tailwind CSS, Prisma, NextAuth, Phaser et quelques bibliothèques utiles pour les données et les expériences. L'objectif est de garder le projet pratique, simple et agréable à construire sans perdre sa dimension visuelle.",
			},
			{
				label: "Ce qui vit aussi ici",
				title: "Outils ludiques, esquisses et idées parallèles",
				text: "Au-delà des articles, le site mise sur l'interactivité: découverte par tags, recommandations, outils pour les utilisateurs et un playground rempli de jeux et d'esquisses. Je ne suis pas développeur de jeux, mais ce playground est un bon terrain pour les projets hobby et une autre façon de montrer ce que je peux construire.",
			},
		],
	},
	playgroundPage: {
		...dictionaries.en.playgroundPage,
		title: "Jeux, esquisses et détours interactifs",
		description:
			"Cette page sert de maison aux expérimentations hobby. Je suis surtout développeur web, pas développeur de jeux, mais ces petits projets sont une bonne façon d'explorer l'interaction, le mouvement et le rendu dans le navigateur.",
		totalProjects: "Total des projets",
		projects: "Projets",
		playableTitle: "Jouables",
		playableDescription:
			"Des expériences interactives que vous pouvez contrôler directement, des jeux aux petits systèmes.",
		watchOnlyTitle: "À regarder",
		watchOnlyDescription:
			"Des pièces visuelles qui se lisent mieux comme des études de mouvement que comme des jeux à score.",
		mode: "Mode",
		loading: "Chargement...",
		closeGame: "Fermer le jeu",
		badges: {
			playable: "Jouable",
			watchOnly: "À regarder",
		},
		games: {
			chess: { name: "Échecs", description: "Jeu d'échecs classique" },
			snakeGame: {
				name: "Snake",
				description: "Jeu du serpent classique",
			},
			minesweeper: {
				name: "Démineur",
				description: "Démineur",
			},
			antSimulator: {
				name: "Simulateur de fourmis",
				description: "Course de colonies de fourmis",
			},
			solarSystem: {
				name: "Système solaire",
				description: "Danse planétaire",
			},
			terminal: { name: "Terminal", description: "Terminal Linux" },
			tankShooter: {
				name: "Tir de chars",
				description: "Jeu de tir avec chars",
			},
			fallingSand: {
				name: "Sable en chute",
				description: "Sable en chute",
			},
			movingMountains: {
				name: "Montagnes mouvantes",
				description: "Montagnes en mouvement",
			},
			survivalShooter: {
				name: "Tir de survie",
				description: "Shooter de survie",
			},
			tetris: { name: "Tetris", description: "Tetris" },
			binaryPong: {
				name: "Pong binaire",
				description: "Pong binaire",
			},
			sineWaves: {
				name: "Ondes sinusoïdales",
				description: "Ondes sinusoïdales",
			},
			voronoiWall: {
				name: "Mur de Voronoï",
				description: "Mur de Voronoï",
			},
			"2048": { name: "2048", description: "2048" },
			pacman: { name: "Pac-Man", description: "Pac-Man" },
			newtonCannon: {
				name: "Canon de Newton",
				description: "Canon de Newton",
			},
			flappyBird: {
				name: "Flappy Bird",
				description: "Flappy Bird",
			},
			labyrinthExplorer: {
				name: "Explorateur de labyrinthe",
				description: "Exploration de labyrinthe",
			},
		},
	},
	recent: {
		eyebrow: "Derniers articles",
		title: "Les articles les plus récents, dans l'ordre",
		description:
			"Cette page est la vue la plus nette du blog par ordre de publication. Elle garde les derniers textes au premier plan, avec la pagination et les repères de sujet à portée de main.",
		postCount: "Nombre d'articles",
		currentPage: "Page actuelle",
		totalViews: "Total des vues",
		latestArrival: "Dernière arrivée",
		readingGuide: "Guide de lecture",
		noPublished:
			"Aucun article publié pour le moment. Créez votre premier article et il apparaîtra ici comme la dernière arrivée.",
		stayOriented: "Garder le cap",
		stayOrientedDescription:
			"Parcourez le blog page par page, gardez un oeil sur l'entrée la plus récente et sautez vers les sujets qui reviennent le plus souvent dans le dernier lot de publications.",
		showingNow: "Affichage actuel",
		pageControls: "Contrôles de page",
		freshTopics: "Sujets récents",
		topicCountsLater:
			"Les compteurs de sujets apparaîtront ici une fois des articles publiés.",
		recentPosts: "Articles récents",
		recentPostsTitle: "Les entrées les plus récentes de devblog",
		recentPostsDescription:
			"Classées strictement par date de publication afin que la page se comporte comme un vrai flux de nouveautés, et non comme un mélange aléatoire.",
		noPosts:
			"Aucun article n'est encore disponible. Cette page lit maintenant directement la base de données et se remplira dès qu'il y aura des entrées publiées.",
		noPublishedShort: "Aucun article publié pour le moment",
		relatedTags: (count: number) =>
			`${count} ${count === 1 ? "tag connexe" : "tags connexes"}`,
		visibleRange: (start: number, end: number, total: number) =>
			`Articles ${start}-${end} sur ${total}`,
		pageOf: (page: number, total: number) => `Page ${page} sur ${total}`,
	},
	trending: {
		eyebrow: "En tendance",
		title: "Ce que les lecteurs regardent en ce moment",
		description:
			"L'accordéon reste la signature de la page, mais le reste l'accompagne désormais: articles classés, signaux de sujet visibles et raisons plus claires de leur position.",
		trackedPosts: "Articles suivis",
		topPost: "Article principal",
		totalViews: "Total des vues",
		noTrending:
			"Aucun article tendance n'est encore disponible. Cette section se remplira lorsque les articles publiés commenceront à accumuler des vues.",
		trendSignals: "Signaux de tendance",
		topicRadar: "Radar des sujets",
		topicRadarDescription:
			"Les sujets principaux les plus présents dans la sélection tendance actuelle. Utilisez-les pour basculer vers des articles liés sans perdre le contexte de ce qui fonctionne en ce moment.",
		topicSignalsLater:
			"Les signaux de sujet apparaîtront ici une fois des articles publiés.",
		leadingPost: "Article en tête",
		leadingPostEmpty:
			"Aucun leader de tendance pour le moment. Publiez des articles et accumulez des vues pour construire ce classement.",
		ranking: "Classement",
		topMomentum: "Top articles par dynamique",
		topMomentumDescription:
			"Les articles les plus lus du moment, ordonnés par vues pour que la liste reflète réellement une tendance plutôt qu'un échantillon aléatoire.",
		moreToWatch: "À surveiller aussi",
		risingPosts: "Articles en progression",
		risingPostsDescription:
			"Des articles juste sous le sommet qui méritent quand même une présentation claire et lisible plutôt qu'une liste dense.",
		notEnoughPosts:
			"Il n'y a pas encore assez d'articles pour une seconde sélection mise en avant.",
		readPost: "Lire l'article",
		focusPost: (title: string) => `Mettre en avant ${title}`,
		viewsSuffix: (count: string) => `${count} vues`,
	},
	search: {
		eyebrow: "Rechercher des articles",
		description:
			"Parcourez les articles correspondants sur tout devblog. Les résultats utilisent les mêmes cartes que le reste du site, avec pagination si la requête dépasse une page.",
		matches: "Correspondances",
		noMatch: "Aucun résultat",
		nothingFound: (query: string) => `Aucun résultat pour "${query}".`,
		noMatchDescription:
			"Essayez une requête plus courte, recherchez par tag ou par auteur, ou revenez aux derniers articles pour continuer à parcourir.",
		seeRecentPosts: "Voir les articles récents",
		resultsFor: (query: string) => `Résultats pour "${query}"`,
	},
	tag: {
		eyebrow: "Parcourir par tag",
		title: "Découvrir les articles par sujet",
		description:
			"Utilisez les tags pour filtrer rapidement le blog. Choisissez un sujet principal, ajoutez quelques tags secondaires et gardez la grille de résultats sous les yeux.",
		totalTags: "Total des tags",
		selected: "Sélectionnés",
		visiblePosts: "Articles visibles",
		mainTopics: "Sujets principaux",
		mainTopicsDescription:
			"Les grandes catégories qui structurent chaque article.",
		supportingTags: "Tags secondaires",
		supportingTagsDescription:
			"Utilisez-les pour affiner la grille sans perdre le contexte.",
		noPostsYet: "Pas encore d'articles",
		unlockAfterFirstPost:
			"La navigation par tags sera disponible après le premier article publié",
		tagBrowsingDescription:
			"La page tags lit maintenant la base de données réelle, elle restera donc vide tant qu'il n'y aura pas d'articles publiés et de tags à afficher.",
		noMatches: "Aucun résultat",
		noPostsFit: "Aucun article ne correspond à cette combinaison",
		noPostsFitDescription:
			"Essayez de retirer l'un des tags actifs ou revenez à un sujet principal plus large. Les choix rapides du panneau de filtres sont un bon point de réinitialisation.",
		filterPosts: "Filtrer les articles",
		findTopic: "Trouver un sujet",
		filterDescription: (max: number) =>
			`Recherchez des tags, combinez-en jusqu'à ${max}, et affinez la grille sans quitter la page.`,
		searchTags: "Rechercher des tags",
		selectedTags: "Tags sélectionnés",
		selectedTagsHint:
			"Ajoutez un autre tag pour affiner davantage, ou réinitialisez pour élargir les résultats.",
		selectedTagsEmpty:
			"Commencez par un sujet large, puis ajoutez des tags secondaires si vous avez besoin de resserrer les résultats.",
		clearFilters: "Effacer les filtres",
		quickPicks: "Choix rapides",
		quickPicksDescription:
			"Des tags populaires qui ouvrent rapidement la page.",
		tagGroupMainDescription:
			"Les catégories principales qui définissent l'article.",
		tagGroupOtherDescription: "Détails secondaires et sujets liés.",
		noTagsMatch: "Aucun tag ne correspond à la recherche actuelle.",
		resultsSummary: (resultsCount: number, tagCount: number) =>
			`${resultsCount} ${resultsCount === 1 ? "article" : "articles"} correspondant à ${tagCount} ${tagCount === 1 ? "tag" : "tags"}`,
		showingAll: (resultsCount: number) =>
			`Affichage de tous les ${resultsCount} ${resultsCount === 1 ? "article" : "articles"}`,
		resultsDescription:
			"Retirez un tag pour élargir les résultats ou continuez à combiner des sujets proches pour rester ciblé.",
		resultsDescriptionEmpty:
			"Utilisez les choix rapides, les bandes défilantes ou le panneau de filtres pour entrer dans un thème précis.",
		resetAll: "Tout réinitialiser",
		removeTag: (label: string) => `Retirer ${label}`,
		noActiveFilters: "Aucun filtre actif.",
	},
	login: {
		...dictionaries.en.login,
		eyebrow: "Accès membre",
		title: "Connexion",
		email: "E-mail",
		password: "Mot de passe",
		hidePassword: "Masquer le mot de passe",
		showPassword: "Afficher le mot de passe",
		continue: "Continuer",
		noAccount: "Pas encore de compte ?",
		register: "Créer un compte",
		invalidCredentials: "Email ou mot de passe invalide.",
		unableToLogin: "Connexion impossible pour le moment.",
	},
	register: {
		...dictionaries.en.register,
		eyebrow: "Créer un accès",
		title: "Inscription",
		name: "Nom",
		email: "E-mail",
		password: "Mot de passe",
		confirmPassword: "Confirmer le mot de passe",
		hidePassword: "Masquer le mot de passe",
		showPassword: "Afficher le mot de passe",
		createAccount: "Créer un compte",
		haveAccount: "Vous avez déjà un compte ?",
		login: "Connexion",
		unableToCreate: "Impossible de créer le compte pour le moment.",
		accountCreatedLoginFailed:
			"Compte créé, mais la connexion automatique a échoué.",
		unableToCreateShort: "Impossible de créer le compte.",
	},
	profile: {
		overview: "Vue d'ensemble du profil",
		yourProfile: "Votre profil",
		description:
			"Les données réelles du compte viennent maintenant de la base de données, avec le rôle, les fournisseurs connectés, les champs persistés et l'activité en direct.",
		loadingTitle: "Préparation de la page",
		unavailable: "Profil indisponible",
		goToLogin: "Aller à la connexion",
		bookmarks: "Favoris",
		viewedPosts: "Articles vus",
		comments: "Commentaires",
		handle: "Identifiant",
		email: "E-mail",
		role: "Rôle",
		passwordLogin: "Connexion par mot de passe",
		configured: "Configuré",
		notSet: "Non défini",
		connectedAccounts: "Comptes connectés",
		credentialsOnly: "Identifiants uniquement",
		editProfile: "Modifier le profil",
		logout: "Déconnexion",
		profileAlt: (name: string) => `Profil de ${name}`,
		recentActivity: "Activité récente sur le blog",
		noCommentsYet: "Aucun commentaire à afficher pour le moment.",
		editedOn: (date: string) => `Modifié ${date}`,
		itemCount: (count: number) =>
			`${count} ${count === 1 ? "élément" : "éléments"}`,
		loadLoginRequired: "Veuillez vous connecter pour accéder à votre profil.",
		loadNotFound: "Ce profil est introuvable.",
		loadError: "Impossible de charger ce profil pour le moment.",
		saveError: "Impossible d'enregistrer le profil.",
	},
	profileEdit: {
		settingsEyebrow: "Réglages du profil",
		title: "Modifier le profil",
		closeModal: "Fermer la fenêtre d'édition du profil",
		preview: "Aperçu",
		previewAlt: "Aperçu du profil",
		providerAvailable: "Photo du fournisseur disponible",
		providerMissing: "Aucune photo de fournisseur enregistrée",
		providerPhoto: "Photo du fournisseur",
		generatedAvatar: "Avatar généré",
		uploadPhoto: "Téléverser une photo",
		uploadHint: "JPG, PNG ou WEBP jusqu'à 2 Mo.",
		uploadedImageLabel: "Image téléversée",
		uploaded: (name: string) => `Téléversé : ${name}`,
		displayName: "Nom affiché",
		profileUrl: (handle: string) => `URL du profil : \`/profile/${handle}\``,
		description: "Description",
		changePassword: "Changer le mot de passe",
		createPassword: "Créer un mot de passe",
		changePasswordDescription:
			"Mettez à jour votre mot de passe email sans perdre la connexion sociale.",
		createPasswordDescription:
			"Ajoutez un mot de passe email à ce compte social.",
		optional: "Optionnel",
		currentPassword: "Mot de passe actuel",
		newPassword: "Nouveau mot de passe",
		confirmNewPassword: "Confirmer le nouveau mot de passe",
		save: "Enregistrer le profil",
		saving: "Enregistrement...",
	},
	profileValidation: {
		nameRequired: "Le nom est requis.",
		maxChars: (max: number) => `Maximum ${max} caractères.`,
		handleRequired: "L'identifiant est requis.",
		handleLettersNumbersOnly:
			"Utilisez uniquement des lettres et des chiffres.",
		handleMin: (min: number) =>
			`L'identifiant doit contenir au moins ${min} caractères.`,
		handleMax: (max: number) =>
			`L'identifiant doit contenir au plus ${max} caractères.`,
		uploadRequired: "Téléversez une image JPG, PNG ou WEBP.",
		uploadAllowed: "Seules les images JPG, PNG ou WEBP sont autorisées.",
		uploadMaxSize: "La taille maximale de l'image est de 2 Mo.",
		invalidProviderUrl: (provider: string) => `URL ${provider} invalide.`,
		currentPasswordIncorrect: "Le mot de passe actuel est incorrect.",
		handleTaken: "Cet identifiant est déjà pris.",
		unableToSave: "Impossible d'enregistrer le profil.",
	},
	newPost: {
		createPageEyebrow: "Nouveau post",
		createPageTitle: "Créer un article prêt pour la production",
		createPageDescription:
			"Rédigez le vrai markdown, joignez de vrais médias et enregistrez directement dans le backend pour que la page de l'article affiche exactement ce contenu.",
		accessRequiredTitle: "Accès auteur requis",
		accessRequiredDescription:
			"Cette page est réservée aux comptes contributeurs. Connectez-vous avec un profil autorisé à écrire pour rédiger, relire et publier des articles.",
		editPageEyebrow: "Modifier le post",
		editPageTitle: "Mettre à jour l'article",
		editPageDescription:
			"Affinez les métadonnées, le corps ou les médias et réenregistrez directement sur le même enregistrement persistant.",
		editAccessDeniedTitle: "Accès refusé",
		editAccessDeniedDescription:
			"Seul l'auteur ou les administrateurs du site peuvent modifier ce post.",
		role: "Rôle",
		author: "Auteur",
		defaultAuthor: "Auteur",
		language: "Original language",
		languageHelp:
			"This is the language the post was first written in. Translations are attached separately on the edit page.",
		mode: "Mode",
		modeCreating: "Création",
		modeEditing: "Édition",
		editorEyebrowCreate: "Nouveau post",
		editorEyebrowEdit: "Modifier le post",
		editorTitleCreate: "Construire le post avant sa mise en ligne",
		editorTitleEdit: "Affiner la version publiée",
		editorDescription:
			"L'éditeur enregistre le vrai markdown, les vrais chemins média et les vraies métadonnées dans Prisma. Ce que vous prévisualisez ici est ce qui sera rendu sur la page du post.",
		storySetupEyebrow: "Mise en place",
		storySetupTitle: "Verrouiller d'abord les métadonnées",
		title: "Titre",
		titlePlaceholder: "Un titre qui mérite le clic",
		slug: "Slug",
		slugPlaceholder: "slug-url-du-post",
		regenerate: "Régénérer",
		finalUrl: (slug: string) => `URL finale : /post/${slug}`,
		description: "Description",
		generateFromContent: "Générer depuis le contenu",
		descriptionPlaceholder:
			"Que doit comprendre le lecteur avant d'ouvrir l'article ?",
		visualsEyebrow: "Visuel",
		visualsTitle: "Définir la miniature du post",
		thumbnail: "Miniature",
		thumbnailDescription:
			"Elle pilote l'image principale sur la page du post et la miniature des cartes ailleurs sur le site.",
		upload: "Téléverser",
		uploading: "Téléversement...",
		thumbnailPreviewAlt: "Miniature du post",
		thumbnailEmpty: "Téléversez l'image qui doit représenter ce post.",
		thumbnailUploaded: "Miniature téléversée.",
		thumbnailUploadError: "Impossible de téléverser la miniature.",
		thumbnailAlt: "Texte alternatif de la miniature",
		thumbnailAltPlaceholder:
			"Décrivez la miniature pour l'accessibilité et les aperçus",
		bodyEyebrow: "Corps",
		bodyTitle: "Écrire et relire au même endroit",
		bodyDescription:
			"Écrivez en markdown, téléversez des images intégrées et vérifiez le rendu final avant d'enregistrer.",
		readTime: "Temps de lecture",
		taxonomyEyebrow: "Taxonomie",
		taxonomyTitle: "Positionner l'article",
		mainTag: "Tag principal",
		tags: "Étiquettes",
		readinessEyebrow: "Prêt à publier",
		readinessTitle: "Vérifier l'essentiel",
		checklistTitleSet: "Titre défini",
		checklistThumbnailUploaded: "Miniature téléversée",
		checklistMainTagChosen: "Tag principal choisi",
		checklistSupportingTagsAdded: "Tags secondaires ajoutés",
		checklistDescriptionReady: "Description prête",
		checklistBodyHasSubstance: "Le corps a de la substance",
		ready: "Prêt",
		missing: "Manquant",
		wordCount: (count: number) => `${count} mots`,
		tagCount: (count: number) =>
			`${count} tag${count === 1 ? "" : "s"} attaché${count === 1 ? "" : "s"}`,
		currentTarget: (status: string) => `Cible actuelle : ${status}`,
		currentLanguage: (language: string) => `Original language: ${language}`,
		publishEyebrow: "Publication",
		publishTitle: "Choisir la prochaine étape",
		statusDraftLabel: "Enregistrer le brouillon",
		statusDraftDescription:
			"Gardez le post privé pendant que vous façonnez le contenu.",
		statusPendingReviewLabel: "Envoyer en relecture",
		statusPendingReviewDescription:
			"Marquez le brouillon comme prêt pour une relecture éditoriale.",
		statusPublishedLabel: "Publier maintenant",
		statusPublishedDescription:
			"Rendre le post visible immédiatement sur le site.",
		saving: "Enregistrement...",
		clearForm: "Vider le formulaire",
		submitError:
			"Impossible d'enregistrer le post pour le moment. Veuillez réessayer.",
		submitSuccessPublished: "Post publié.",
		submitSuccessReview: "Post envoyé en relecture.",
		submitSuccessDraft: "Brouillon enregistré.",
		mainTagPlaceholder:
			"Choisissez un sujet existant ou définissez un nouveau tag principal",
		mainTagHelp:
			"Les tags principaux regroupent le post dans les listes et recommandations.",
		tagsPlaceholder: "Ajoutez des tags puis appuyez sur Entrée",
		tagsLimitReached: "Limite de tags atteinte",
		tagSlotsLeft: (count: number) =>
			`Il reste ${count} emplacements de tags. Utilisez des libellés précis et faciles à rechercher.`,
		editorControlsEyebrow: "Contrôles de l'éditeur",
		editorControlsTitle: "Façonner le markdown avec intention",
		editorControlsDescription:
			"Les images intégrées restent là où vous les insérez et se rendent centrées à la fois dans l'aperçu et dans le post final.",
		modeWrite: "Écrire",
		modeWriteDescription: "Se concentrer sur le markdown.",
		modePreview: "Aperçu",
		modePreviewDescription: "Lire le rendu final.",
		modeSplit: "Divisé",
		modeSplitDescription: "Écrire et prévisualiser ensemble.",
		toolbarInline: "En ligne",
		toolbarBlocks: "Blocs",
		toolbarBold: "Gras",
		toolbarItalic: "Italique",
		toolbarCode: "Code",
		toolbarLink: "Lien",
		toolbarCodeBlock: "Bloc de code",
		toolbarHeading: "Titre",
		toolbarQuote: "Citation",
		toolbarList: "Liste",
		toolbarNumbered: "Numérotée",
		toolbarDivider: "Séparateur",
		insertImage: "Insérer une image",
		dualPanel: "Double panneau",
		modeBadge: (mode: string) => `Mode ${mode}`,
		markdownEyebrow: "Markdown",
		markdownDescription:
			"Écrivez en pur markdown et gardez le contrôle de l'endroit où chaque bloc et image se placent.",
		editableSource: "Source modifiable",
		markdownPlaceholder:
			"Rédigez l'article en Markdown.\n\nExemple:\n## Titre de section\n\nUn paragraphe avec **mise en valeur** et un [lien](https://example.com).\n",
		previewEyebrow: "Aperçu",
		previewDescription:
			"L'aperçu utilise le même moteur de rendu que la page du post publié.",
		finalRendering: "Rendu final",
		emptyPreview: "Commencez à écrire pour voir le rendu final du post.",
		editorWordCount: (count: number) => `${count} mots`,
		editorReadTime: (count: number) => `${count} min de lecture`,
		editorCharacters: (used: number, max: number) =>
			`${used}/${max} caractères`,
		imagesInserted: (count: number) =>
			`${count} ${count === 1 ? "image insérée" : "images insérées"} dans le markdown.`,
		imageDefaultAlt: "Image",
		imageUploadError: "Impossible de téléverser l'image.",
		translationEyebrow: "Translations",
		translationTitle: "Add or update a localized version",
		translationDescription:
			"Translations override the title, description, thumbnail alt text, and body when a reader is browsing in that language. The slug, tags, and status stay tied to the original post.",
		translationOriginalLanguage: "Original post language",
		translationNoLocales:
			"All supported site languages are already covered by the original post or the saved translations.",
		translationLanguage: "Translation language",
		translationLanguageHelp:
			"Choose the site language that should receive this localized version.",
		translationExisting: "Available translations",
		translationNoneYet: "No translations saved yet.",
		translationStatusExisting: "Editing saved translation",
		translationStatusNew: "Creating new translation",
		translationCopyFromOriginal: "Copy original text",
		translationCopiedFromOriginal:
			"Original post content copied into the translation editor.",
		translationBodyDescription:
			"Write the translated markdown that should replace the original body for this language.",
		translationSave: "Save translation",
		translationSaving: "Saving translation...",
		translationSaveSuccess: "Translation saved.",
		translationSaveError:
			"Unable to save the translation right now. Please try again.",
		translationMustDiffer:
			"Choose a language different from the original post.",
		progressAria: (progress: number, remaining: number) =>
			`${progress}% de progression, ${remaining} minutes restantes`,
	},
	postValidation: {
		localeRequired: "Post language is required.",
		imageRequired: "L'image est requise.",
		imageInvalid:
			"L'image doit être un chemin de fichier téléversé ou une URL valide.",
		tagEmpty: "Les tags ne peuvent pas être vides.",
		tagMaxLength: (max: number) =>
			`Les tags doivent contenir au plus ${max} caractères.`,
		titleMin: "Le titre doit contenir au moins 3 caractères.",
		titleMax: (max: number) =>
			`Le titre doit contenir au plus ${max} caractères.`,
		slugMax: (max: number) =>
			`Le slug doit contenir au plus ${max} caractères.`,
		slugInvalid:
			"Le slug ne peut contenir que des lettres minuscules, des chiffres et des tirets.",
		contentMin: "Le contenu doit contenir au moins 30 caractères.",
		contentMax: (max: number) =>
			`Le contenu doit contenir au plus ${max} caractères.`,
		thumbnailAltMax: (max: number) =>
			`Le texte alternatif de la miniature doit contenir au plus ${max} caractères.`,
		mainTagRequired: "Un tag principal est requis.",
		tagsRequired: "Au moins un tag est requis.",
		tagsMaxItems: (max: number) =>
			`Les tags doivent contenir au plus ${max} éléments.`,
		tagsUnique: "Les tags doivent être uniques.",
		descriptionMax: (max: number) =>
			`La description doit contenir au plus ${max} caractères.`,
	},
	post: {
		relatedReading: "Lecture liée",
		moreFromThisLane: "Plus dans cette veine",
		statusPublished: "Publié",
		statusPendingReview: "En relecture",
		statusDraft: "Brouillon",
		translatedToCurrentLanguage: "Translated to your current language",
		translationFromLanguage: (language: string) =>
			`Originally written in ${language}`,
		writtenBy: "Écrit par",
		editPost: "Modifier le post",
		edit: "Modifier",
		authorProfile: "Profil de l'auteur",
		moreIn: (tag: string) => `Plus dans ${tag}`,
		authorDescription: (
			name: string,
			mainTag: string,
			relatedTopics: string[],
		) =>
			relatedTopics.length > 0
				? `${name} écrit autour de ${mainTag}, avec des thèmes récurrents comme ${relatedTopics.join(" et ")}.`
				: `${name} écrit autour de ${mainTag}.`,
		commentSection: "Section des commentaires",
		commentPlaceholder: "Ajouter un commentaire",
		commentAs: (name: string) => `Commenter en tant que ${name}`,
		loginRequiredToComment: "Connexion requise pour commenter",
		comment: "Commenter",
		postedOn: (date: string) => `Publié ${date}`,
		reportComment: "Signaler le commentaire",
		loginModalTitle: "Vous devez être connecté pour faire cela.",
		loginModalDescription:
			"Connectez-vous pour profiter d'une meilleure expérience et rejoindre la conversation.",
		reportCommentTitle: "Signaler le commentaire",
		reportingCommentBy: (author: string) =>
			`Signalement du commentaire de ${author} :`,
		reason: "Motif",
		chooseReason: "Choisir un motif...",
		details: "Détails",
		detailsOptional: "Détails (optionnel)",
		detailsMin: (min: number) => `Détails (min. ${min} caractères)`,
		describeIssue: "Décrivez le problème...",
		addContext: "Ajouter du contexte (optionnel)...",
		submitReport: "Envoyer le signalement",
		submitting: "Envoi...",
		reportValidation: "Veuillez remplir tous les champs obligatoires.",
	},
	authValidation: {
		emailRequired: "L'email est requis.",
		emailInvalid: "Saisissez une adresse email valide.",
		passwordTooLong: (max: number) =>
			`Le mot de passe doit contenir au plus ${max} caractères.`,
		passwordRequired: "Le mot de passe est requis.",
		passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
		nameTooShort: "Le nom doit contenir au moins 2 caractères.",
		nameTooLong: "Le nom doit contenir au plus 60 caractères.",
		confirmPasswordRequired: "Veuillez confirmer votre mot de passe.",
		passwordsDoNotMatch: "Les mots de passe ne correspondent pas.",
		currentPasswordRequired: "Le mot de passe actuel est requis.",
		newPasswordRequired: "Le nouveau mot de passe est requis.",
		confirmNewPasswordRequired:
			"Veuillez confirmer votre nouveau mot de passe.",
	},
} as unknown as typeof dictionaries.en;

const japaneseMessages = {
	...dictionaries.en,
	common: {
		...dictionaries.en.common,
		home: "ホーム",
		recent: "最新",
		trending: "注目",
		tags: "タグ",
		about: "概要",
		playground: "プレイグラウンド",
		profile: "プロフィール",
		create: "作成",
		suggest: "提案",
		login: "ログイン",
		logout: "ログアウト",
		search: "検索",
		close: "閉じる",
		cancel: "キャンセル",
		results: "結果",
		page: "ページ",
		views: "閲覧数",
		bookmarks: "ブックマーク",
		comments: "コメント",
		author: "著者",
		edited: "更新済み",
		published: "公開済み",
		lastSaved: "最終保存",
		readTime: "読了時間",
		minutesShort: "分",
		previous: "前へ",
		next: "次へ",
		loadingProfile: "プロフィールを読み込み中",
		preparingPage: "ページを準備中",
		noItemsYet: "まだ表示できる項目はありません。",
		noDescriptionYet: "プロフィール説明はまだありません。",
		percentComplete: (progress: number) => `${progress}% 完了`,
	},
	language: {
		...dictionaries.en.language,
		label: "言語",
		ariaLabel: "サイトの言語を変更",
		menuTitle: "言語を選択",
	},
	header: {
		...dictionaries.en.header,
		eyebrow: "個人開発ブログ",
		description:
			"チュートリアル、意見、フロントエンドのメモ、インタラクティブなサイドプロジェクトをひとつの場所にまとめています。",
		suggestTitle: "記事を提案する（確認が必要）",
		homeAria: "ホーム",
	},
	nav: {
		...dictionaries.en.nav,
		navigation: "ナビゲーション",
		openMenu: "ナビゲーションメニューを開く",
		closeMenu: "ナビゲーションメニューを閉じる",
	},
	footer: {
		...dictionaries.en.footer,
		title: "記事、実験、インターフェース制作。",
		description:
			"文章、インタラクションの試作、そして説明するより見せたほうが早いアイデアのためのプレイグラウンドを備えた個人開発ブログです。",
		navigate: "移動",
		socials: "SNS",
		closing: "記事、UI実験、インタラクティブなサイドワーク。",
	},
	popover: {
		...dictionaries.en.popover,
		aria: "投稿アクション",
		save: "ブックマークに保存",
		share: "共有",
		moreLikeThis: "似た投稿をもっと見る",
		lessLikeThis: "似た投稿を減らす",
	},
	home: {
		startHere: "ここから始める",
		title: "探索の余地がある個人開発ブログ",
		description:
			"DevBlog は、開発に関する文章、意見、チュートリアル、実験を公開する場所です。トップページでは注目の読み物、今読まれているもの、そしてブログ全体へ広がる導線をまとめています。",
		featuredPosts: "注目の記事",
		trendingPicks: "トレンド選出",
		recommended: "おすすめ",
		trendingSnapshot: "トレンド概要",
		trendingTitle: "今注目を集めているもの",
		trendingDescription:
			"今まさに読者を引きつけている投稿をすばやく確認できる一覧です。以前と同じ場所に置きつつ、セクション構成をより明確にしています。",
		exploreFurther: "さらに探索",
		exploreTitle: "ブログに入る別の道",
		exploreDescription:
			"新着、注目、そして再読する価値のある投稿の間をこのセクションで行き来できます。",
		editorPicks: "編集部のおすすめ",
		noRecommended:
			"おすすめの記事はまだありません。いくつか投稿を公開すると、このセクションはライブデータベースから自動で埋まります。",
		noPosts:
			"公開済みの投稿はまだありません。トップページはすでに Prisma に接続されているため、実際の投稿が存在すれば各セクションに表示されます。",
		scrollToTrending: "注目記事までスクロール",
		noTrending:
			"トレンド記事はまだありません。公開済みの投稿に閲覧数が集まり始めると、ここに自動で表示されます。",
		explore: "探索",
		trendingPosts: "注目記事",
		trendingPostsDescription: "今いちばん注目を集めている投稿を確認できます。",
		recentPosts: "新着記事",
		recentPostsDescription:
			"いちばん新しい文章から読み始めて、そこからさかのぼれます。",
		browseByTag: "タグで探す",
		browseByTagDescription:
			"公開中の投稿カタログをトピックと補助タグで絞り込みます。",
		noSectionPost: "このセクションに表示できる投稿はまだありません。",
		noRecommendedCallouts:
			"おすすめの注目枠は、さらに投稿が公開されるとここに表示されます。",
		viewSection: "セクションを見る",
	},
	notFound: {
		...dictionaries.en.notFound,
		description: "お探しのページは見つかりませんでした。",
		backHome: "ホームに戻る",
	},
	searchBar: {
		...dictionaries.en.searchBar,
		placeholder: "投稿を検索",
		ariaLabel: "投稿を検索",
		openSearch: "検索を開く",
		searchSuggestions: "検索候補",
		viewAllResults: "すべての結果を見る",
	},
	suggestModal: {
		...dictionaries.en.suggestModal,
		title: "記事を提案する",
		close: "提案モーダルを閉じる",
		fieldTitle: "タイトル",
		titlePlaceholder: "例: Next 14 の React Server Components を理解する",
		fieldIdea: "どんな案ですか？",
		ideaPlaceholder:
			"短い構成案、箇条書き、参考リンクなどを追加してください（任意）。",
		reviewNote:
			"提案内容は公開前に確認されます。機密情報や個人情報は含めないでください。",
		submitted: "送信しました",
		submitting: "送信中...",
		submit: "提案を送信",
		titleTooShort: (min: number) =>
			`タイトルは ${min} 文字以上である必要があります。`,
		maxChars: (max: number) => `最大 ${max} 文字です。`,
	},
	about: {
		...dictionaries.en.about,
		eyebrow: "devblog について",
		title: "書き、試し、出し続けるための場所",
		description:
			"このサイトは、文章、インターフェース制作、サイド実験が同じフレームに収まる場所です。静的なポートフォリオ保管庫ではなく、実用的で個人的で、動き続けるものとして保つことを目指しています。",
		storyCards: [
			{
				label: "なぜ存在するのか",
				title: "実際に使い続けているブログ",
				text: "DevBlog は、私個人のソフトウェア開発ブログです。ここでチュートリアル、意見、実験、インターフェースのアイデア、そして特に磨くのが好きな Web 開発の領域について公開しています。",
			},
			{
				label: "どう作られているか",
				title: "視覚表現の余地を残した実用的なスタック",
				text: "このスタックは Next.js、React、Tailwind CSS、Prisma、NextAuth、Phaser、そしてデータ整理や実験向けのいくつかの補助ライブラリを中心に組み立てています。目標は、視覚面を損なわずに、実用的でシンプルかつ作っていて気持ちのいいプロジェクトに保つことです。",
			},
			{
				label: "ここにある他のもの",
				title: "遊び心のあるツール、スケッチ、脇道のアイデア",
				text: "投稿以外にも、このサイトはインタラクティブ性を重視しています。タグベースの探索、レコメンド、ユーザーツール、そしてゲームやスケッチを集めたプレイグラウンドがあります。私はゲーム開発者ではありませんが、このプレイグラウンドは趣味のプロジェクトを置くのにちょうどよく、自分が作れるものを別の形で見せる場にもなっています。",
			},
		],
	},
	playgroundPage: {
		...dictionaries.en.playgroundPage,
		title: "ゲーム、スケッチ、遊べる寄り道",
		description:
			"このページは趣味の実験のための場所です。私は主に Web 開発者でゲーム開発者ではありませんが、こうした小さな作品はインタラクション、動き、ブラウザ描画の考え方を試すのに役立ちます。",
		totalProjects: "総プロジェクト数",
		projects: "プロジェクト",
		playableTitle: "操作可能",
		playableDescription:
			"ゲームや小さなシステムなど、直接操作できる体験型の実験です。",
		watchOnlyTitle: "鑑賞用",
		watchOnlyDescription:
			"スコアを競うゲームというより、動きのスタディとして見るほうが合うビジュアル作品です。",
		mode: "モード",
		loading: "読み込み中...",
		closeGame: "ゲームを閉じる",
		badges: {
			playable: "操作可能",
			watchOnly: "鑑賞用",
		},
		games: {
			chess: { name: "チェス", description: "クラシックなチェスゲーム" },
			snakeGame: {
				name: "スネークゲーム",
				description: "クラシックなスネークゲーム",
			},
			minesweeper: {
				name: "マインスイーパー",
				description: "マインスイーパー",
			},
			antSimulator: {
				name: "アリシミュレーター",
				description: "アリのコロニー競争",
			},
			solarSystem: {
				name: "太陽系",
				description: "惑星のダンス",
			},
			terminal: { name: "ターミナル", description: "Linux ターミナル" },
			tankShooter: {
				name: "タンクシューター",
				description: "戦車シューティング",
			},
			fallingSand: {
				name: "落ちる砂",
				description: "落ちる砂",
			},
			movingMountains: {
				name: "動く山々",
				description: "動く山々",
			},
			survivalShooter: {
				name: "サバイバルシューター",
				description: "サバイバルシューティング",
			},
			tetris: { name: "テトリス", description: "テトリス" },
			binaryPong: {
				name: "バイナリーポン",
				description: "バイナリーポン",
			},
			sineWaves: {
				name: "正弦波",
				description: "正弦波",
			},
			voronoiWall: {
				name: "ボロノイウォール",
				description: "ボロノイの壁",
			},
			"2048": { name: "2048", description: "2048" },
			pacman: { name: "パックマン", description: "パックマン" },
			newtonCannon: {
				name: "ニュートンキャノン",
				description: "ニュートン砲",
			},
			flappyBird: {
				name: "フラッピーバード",
				description: "フラッピーバード",
			},
			labyrinthExplorer: {
				name: "迷宮探検",
				description: "迷宮探検ゲーム",
			},
		},
	},
	recent: {
		eyebrow: "最新の投稿",
		title: "新しい投稿を順番に",
		description:
			"このページは公開順でブログを見る最も分かりやすい一覧です。新しい文章を前面に置きつつ、ページ移動やトピックの手がかりも近くに保っています。",
		postCount: "投稿数",
		currentPage: "現在のページ",
		totalViews: "総閲覧数",
		latestArrival: "最新追加",
		noPublished:
			"公開済みの投稿はまだありません。最初の投稿を作成すると、ここに最新の追加として表示されます。",
		readingGuide: "読書ガイド",
		stayOriented: "見失わない",
		stayOrientedDescription:
			"ページごとにブログをたどり、最新エントリーを把握しながら、直近の投稿群でよく現れるトピックへ飛べます。",
		showingNow: "現在の表示範囲",
		pageControls: "ページ操作",
		freshTopics: "新しいトピック",
		topicCountsLater:
			"投稿が公開されると、トピックの件数がここに表示されます。",
		recentPosts: "新着投稿",
		recentPostsTitle: "devblog の最新エントリー",
		recentPostsDescription:
			"公開日順に厳密に並べているため、ランダムな寄せ集めではなく本当の新着フィードとして機能します。",
		noPosts:
			"まだ利用可能な投稿はありません。このページは現在データベースを直接参照しており、公開済みエントリーができ次第表示されます。",
		noPublishedShort: "公開済みの投稿はまだありません",
		relatedTags: (count: number) =>
			`${count} 件の関連${count === 1 ? "タグ" : "タグ"}`,
		visibleRange: (start: number, end: number, total: number) =>
			`投稿 ${start}-${end} / ${total}`,
		pageOf: (page: number, total: number) => `${page} / ${total} ページ`,
	},
	trending: {
		eyebrow: "現在の注目",
		title: "読者が注目しているもの",
		description:
			"このページの特徴であるアコーディオンはそのままに、ランキング、トピックの気配、なぜ上位なのかがより分かりやすくなりました。",
		trackedPosts: "追跡中の投稿",
		topPost: "トップ投稿",
		totalViews: "総閲覧数",
		noTrending:
			"トレンド記事はまだありません。公開済みの投稿に閲覧数が集まり始めると、このセクションに表示されます。",
		trendSignals: "トレンド指標",
		topicRadar: "トピックレーダー",
		topicRadarDescription:
			"現在のトレンド群で特に存在感の強い主要トピックです。今熱いものの文脈を保ったまま、関連投稿へ分岐できます。",
		topicSignalsLater: "投稿が公開されると、トピック指標がここに表示されます。",
		leadingPost: "先頭の投稿",
		leadingPostEmpty:
			"まだトレンドの先頭記事はありません。投稿を公開して閲覧数を積み上げると、このランキングが形成されます。",
		ranking: "ランキング",
		topMomentum: "勢いのある投稿",
		topMomentumDescription:
			"現在もっとも読まれている投稿を閲覧数順に並べ、トレンドが実際に反映されるようにしています。",
		moreToWatch: "あわせて注目",
		risingPosts: "上昇中の投稿",
		risingPostsDescription:
			"最上位のすぐ下にいる投稿も、密なリストではなく読みやすい形で把握できます。",
		notEnoughPosts: "二次的な注目リストを作るには、まだ投稿数が足りません。",
		readPost: "投稿を読む",
		focusPost: (title: string) => `${title} に注目する`,
		viewsSuffix: (count: string) => `${count} 閲覧`,
	},
	search: {
		eyebrow: "投稿を検索",
		description:
			"devblog 全体から一致する投稿を探します。結果は他ページと同じカードで表示され、必要ならページ分割されます。",
		matches: "一致",
		noMatch: "一致なし",
		nothingFound: (query: string) =>
			`「${query}」に一致するものは見つかりませんでした。`,
		noMatchDescription:
			"より短いクエリを試すか、タグや著者で検索するか、最新投稿に戻って閲覧を続けてください。",
		seeRecentPosts: "新着投稿を見る",
		resultsFor: (query: string) => `「${query}」の検索結果`,
	},
	tag: {
		eyebrow: "タグで探す",
		title: "トピックごとに投稿を見つける",
		description:
			"タグを使ってブログを素早く絞り込みます。大きなトピックを選び、補助タグを重ね、結果グリッドを見ながら調整できます。",
		totalTags: "タグ総数",
		selected: "選択済み",
		visiblePosts: "表示中の投稿",
		mainTopics: "主要トピック",
		mainTopicsDescription: "各投稿の軸になる大きなカテゴリです。",
		supportingTags: "補助タグ",
		supportingTagsDescription:
			"文脈を失わずに結果グリッドを絞り込むために使います。",
		noPostsYet: "まだ投稿がありません",
		unlockAfterFirstPost: "タグ閲覧は最初の公開投稿の後に利用可能になります",
		tagBrowsingDescription:
			"タグページは現在実際のデータベースを読んでいるため、公開済み投稿と表示可能なタグができるまでは空のままです。",
		noMatches: "一致なし",
		noPostsFit: "この組み合わせに合う投稿はありません",
		noPostsFitDescription:
			"有効なタグをひとつ外すか、もっと広い主要トピックに切り替えてみてください。フィルターパネルのクイック選択がよいリセット地点です。",
		filterPosts: "投稿を絞り込む",
		findTopic: "トピックを探す",
		filterDescription: (max: number) =>
			`タグを検索し、最大 ${max} 個まで組み合わせて、ページを離れずに投稿グリッドを絞り込めます。`,
		searchTags: "タグを検索",
		selectedTags: "選択中のタグ",
		selectedTagsHint:
			"さらに絞り込むには別のタグを追加するか、結果を広げるにはリセットしてください。",
		selectedTagsEmpty:
			"まずは広いトピックから始め、必要なら補助タグを重ねて結果を絞り込んでください。",
		clearFilters: "フィルターをクリア",
		quickPicks: "クイック選択",
		quickPicksDescription: "ページをすばやく開く人気タグです。",
		tagGroupMainDescription: "投稿を定義する主要カテゴリです。",
		tagGroupOtherDescription: "副次的な詳細や関連テーマです。",
		noTagsMatch: "現在の検索に一致するタグはありません。",
		resultsSummary: (resultsCount: number, tagCount: number) =>
			`${tagCount} 個のタグに一致する ${resultsCount} 件の${resultsCount === 1 ? "投稿" : "投稿"}`,
		showingAll: (resultsCount: number) =>
			`全 ${resultsCount} 件の${resultsCount === 1 ? "投稿" : "投稿"}を表示中`,
		resultsDescription:
			"タグを外して結果を広げるか、関連トピックをさらに組み合わせて焦点を保ってください。",
		resultsDescriptionEmpty:
			"クイック選択、流れる行、またはフィルターパネルを使って特定のテーマに入っていけます。",
		resetAll: "すべてリセット",
		removeTag: (label: string) => `${label} を外す`,
		noActiveFilters: "有効なタグフィルターはありません。",
	},
	login: {
		...dictionaries.en.login,
		eyebrow: "メンバーアクセス",
		title: "ログイン",
		email: "メールアドレス",
		password: "パスワード",
		hidePassword: "パスワードを隠す",
		showPassword: "パスワードを表示",
		continue: "続ける",
		noAccount: "アカウントをお持ちでないですか？",
		register: "登録",
		invalidCredentials: "メールアドレスまたはパスワードが無効です。",
		unableToLogin: "現在ログインできません。",
	},
	register: {
		...dictionaries.en.register,
		eyebrow: "アクセスを作成",
		title: "登録",
		name: "名前",
		email: "メールアドレス",
		password: "パスワード",
		confirmPassword: "パスワードを確認",
		hidePassword: "パスワードを隠す",
		showPassword: "パスワードを表示",
		createAccount: "アカウントを作成",
		haveAccount: "すでにアカウントをお持ちですか？",
		login: "ログイン",
		unableToCreate: "現在アカウントを作成できません。",
		accountCreatedLoginFailed:
			"アカウントは作成されましたが、自動ログインに失敗しました。",
		unableToCreateShort: "アカウントを作成できませんでした。",
	},
	profile: {
		overview: "プロフィール概要",
		yourProfile: "あなたのプロフィール",
		description:
			"実際のアカウントデータは現在データベースから取得され、役割、連携プロバイダー、保存済みプロフィール項目、ライブな活動数を含みます。",
		loadingTitle: "ページを準備中",
		unavailable: "プロフィールを利用できません",
		goToLogin: "ログインへ移動",
		bookmarks: "ブックマーク",
		viewedPosts: "閲覧した投稿",
		comments: "コメント",
		handle: "ハンドル",
		email: "メール",
		role: "役割",
		passwordLogin: "パスワードログイン",
		configured: "設定済み",
		notSet: "未設定",
		connectedAccounts: "連携アカウント",
		credentialsOnly: "認証情報のみ",
		editProfile: "プロフィールを編集",
		logout: "ログアウト",
		profileAlt: (name: string) => `${name} のプロフィール`,
		recentActivity: "ブログ全体での最近の活動",
		loadLoginRequired: "プロフィールにアクセスするにはログインしてください。",
		loadNotFound: "このプロフィールは見つかりませんでした。",
		loadError: "現在このプロフィールを読み込めません。",
		saveError: "プロフィールを保存できません。",
		noCommentsYet: "表示できるコメントはまだありません。",
		editedOn: (date: string) => `${date} に編集`,
		itemCount: (count: number) => `${count} 件`,
	},
	profileEdit: {
		settingsEyebrow: "プロフィール設定",
		title: "プロフィールを編集",
		closeModal: "プロフィール編集モーダルを閉じる",
		preview: "プレビュー",
		previewAlt: "プロフィールプレビュー",
		providerAvailable: "プロバイダー写真あり",
		providerMissing: "プロバイダー写真は未登録です",
		providerPhoto: "プロバイダー写真",
		generatedAvatar: "生成アバター",
		uploadPhoto: "写真をアップロード",
		uploadHint: "JPG、PNG、WEBP を 2MB まで。",
		uploadedImageLabel: "アップロード済み画像",
		uploaded: (name: string) => `アップロード済み: ${name}`,
		displayName: "表示名",
		profileUrl: (handle: string) => `プロフィール URL: \`/profile/${handle}\``,
		description: "説明",
		changePassword: "パスワードを変更",
		createPassword: "パスワードを作成",
		changePasswordDescription:
			"ソーシャルログインを失わずに、メールログイン用のパスワードを更新します。",
		createPasswordDescription:
			"このソーシャルアカウントにメールログイン用パスワードを追加します。",
		optional: "任意",
		currentPassword: "現在のパスワード",
		newPassword: "新しいパスワード",
		confirmNewPassword: "新しいパスワードを確認",
		save: "プロフィールを保存",
		saving: "保存中...",
	},
	profileValidation: {
		nameRequired: "名前は必須です。",
		maxChars: (max: number) => `最大 ${max} 文字です。`,
		handleRequired: "ハンドルは必須です。",
		handleLettersNumbersOnly: "英字と数字のみを使用してください。",
		handleMin: (min: number) =>
			`ハンドルは ${min} 文字以上である必要があります。`,
		handleMax: (max: number) =>
			`ハンドルは ${max} 文字以下である必要があります。`,
		uploadRequired: "JPG、PNG、WEBP 画像をアップロードしてください。",
		uploadAllowed: "使用できる画像形式は JPG、PNG、WEBP のみです。",
		uploadMaxSize: "画像の最大サイズは 2MB です。",
		invalidProviderUrl: (provider: string) => `${provider} の URL が無効です。`,
		currentPasswordIncorrect: "現在のパスワードが正しくありません。",
		handleTaken: "そのハンドルはすでに使用されています。",
		unableToSave: "プロフィールを保存できません。",
	},
	newPost: {
		createPageEyebrow: "新規投稿",
		createPageTitle: "本番向けの記事を作成",
		createPageDescription:
			"実際の Markdown を書き、実際のメディアを添付し、バックエンドへ直接保存して、投稿ページに同じ内容を表示します。",
		accessRequiredTitle: "著者権限が必要です",
		accessRequiredDescription:
			"このページは寄稿者アカウント専用です。下書き、レビュー、公開ができる書き込み権限付きプロフィールでログインしてください。",
		editPageEyebrow: "投稿を編集",
		editPageTitle: "記事を更新",
		editPageDescription:
			"メタデータ、本文、メディアを調整し、同じ永続的な投稿レコードへ保存し直します。",
		editAccessDeniedTitle: "アクセス拒否",
		editAccessDeniedDescription:
			"この投稿を編集できるのは著者またはサイト管理者のみです。",
		role: "役割",
		author: "著者",
		defaultAuthor: "著者",
		language: "Original language",
		languageHelp:
			"This is the language the post was first written in. Translations are attached separately on the edit page.",
		mode: "モード",
		modeCreating: "作成中",
		modeEditing: "編集中",
		editorEyebrowCreate: "新規投稿",
		editorEyebrowEdit: "投稿を編集",
		editorTitleCreate: "公開前に投稿を組み立てる",
		editorTitleEdit: "公開済みの形を整える",
		editorDescription:
			"エディターは実際の markdown、実際のメディアパス、実際の投稿メタデータを Prisma に保存します。ここで見るプレビューがそのまま投稿ページで表示されます。",
		storySetupEyebrow: "記事設定",
		storySetupTitle: "まずメタデータを固める",
		title: "タイトル",
		titlePlaceholder: "クリックしたくなるタイトル",
		slug: "スラッグ",
		slugPlaceholder: "post-url-slug",
		regenerate: "再生成",
		finalUrl: (slug: string) => `最終 URL: /post/${slug}`,
		description: "説明",
		generateFromContent: "本文から生成",
		descriptionPlaceholder:
			"記事を開く前に読者に理解してほしいことは何ですか？",
		visualsEyebrow: "ビジュアル",
		visualsTitle: "投稿サムネイルを設定",
		thumbnail: "サムネイル",
		thumbnailDescription:
			"投稿ページのヒーロー画像と、他の一覧に出るカードサムネイルに使われます。",
		upload: "アップロード",
		uploading: "アップロード中...",
		thumbnailPreviewAlt: "投稿サムネイル",
		thumbnailEmpty: "この投稿を表す画像をアップロードしてください。",
		thumbnailUploaded: "サムネイルをアップロードしました。",
		thumbnailUploadError: "サムネイルをアップロードできません。",
		thumbnailAlt: "サムネイル代替テキスト",
		thumbnailAltPlaceholder:
			"アクセシビリティとプレビューのためにサムネイルを説明してください",
		bodyEyebrow: "本文",
		bodyTitle: "ひとつの場所で書いて確認する",
		bodyDescription:
			"Markdown で書き、インライン画像をアップロードし、保存前に最終レンダリングを確認できます。",
		readTime: "読了時間",
		taxonomyEyebrow: "分類",
		taxonomyTitle: "記事を配置する",
		mainTag: "メインタグ",
		tags: "タグ",
		readinessEyebrow: "準備状況",
		readinessTitle: "基本項目を確認する",
		checklistTitleSet: "タイトル設定済み",
		checklistThumbnailUploaded: "サムネイルアップロード済み",
		checklistMainTagChosen: "メインタグ選択済み",
		checklistSupportingTagsAdded: "補助タグ追加済み",
		checklistDescriptionReady: "説明文準備完了",
		checklistBodyHasSubstance: "本文に十分な内容がある",
		ready: "準備完了",
		missing: "不足",
		wordCount: (count: number) => `${count} 語`,
		tagCount: (count: number) => `${count} 個のタグを設定`,
		currentTarget: (status: string) => `現在の対象: ${status}`,
		currentLanguage: (language: string) => `Original language: ${language}`,
		publishEyebrow: "公開",
		publishTitle: "次のステップを選ぶ",
		statusDraftLabel: "下書きを保存",
		statusDraftDescription: "内容を整えている間は投稿を非公開に保ちます。",
		statusPendingReviewLabel: "レビューに送る",
		statusPendingReviewDescription:
			"下書きを編集レビュー準備完了としてマークします。",
		statusPublishedLabel: "今すぐ公開",
		statusPublishedDescription: "投稿をすぐにサイト上で見える状態にします。",
		saving: "保存中...",
		clearForm: "フォームをクリア",
		submitError: "現在投稿を保存できません。もう一度お試しください。",
		submitSuccessPublished: "投稿を公開しました。",
		submitSuccessReview: "投稿をレビューに送りました。",
		submitSuccessDraft: "下書きを保存しました。",
		mainTagPlaceholder:
			"既存のトピックを選ぶか、新しいメインタグを定義してください",
		mainTagHelp: "メインタグは一覧やおすすめ全体で投稿をまとめます。",
		tagsPlaceholder: "タグを追加して Enter を押してください",
		tagsLimitReached: "タグ上限に達しました",
		tagSlotsLeft: (count: number) =>
			`残り ${count} 枠です。検索しやすく焦点の合ったラベルを使ってください。`,
		editorControlsEyebrow: "エディター操作",
		editorControlsTitle: "意図をもって markdown を整える",
		editorControlsDescription:
			"インライン画像は挿入した場所に残り、プレビューでも最終投稿でも中央にレンダリングされます。",
		modeWrite: "執筆",
		modeWriteDescription: "Markdown に集中する。",
		modePreview: "プレビュー",
		modePreviewDescription: "最終レンダリングを読む。",
		modeSplit: "分割",
		modeSplitDescription: "書きながら同時に確認する。",
		toolbarInline: "インライン",
		toolbarBlocks: "ブロック",
		toolbarBold: "太字",
		toolbarItalic: "斜体",
		toolbarCode: "コード",
		toolbarLink: "リンク",
		toolbarCodeBlock: "コードブロック",
		toolbarHeading: "見出し",
		toolbarQuote: "引用",
		toolbarList: "リスト",
		toolbarNumbered: "番号付き",
		toolbarDivider: "区切り線",
		insertImage: "画像を挿入",
		dualPanel: "2画面",
		modeBadge: (mode: string) => `${mode} モード`,
		markdownEyebrow: "Markdown",
		markdownDescription:
			"プレーンな Markdown で書き、各ブロックや画像の配置を自分で管理できます。",
		editableSource: "編集可能なソース",
		markdownPlaceholder:
			"Markdown で記事を書いてください。\n\n例:\n## セクション見出し\n\n**強調** と [リンク](https://example.com) を含む段落。\n",
		previewEyebrow: "プレビュー",
		previewDescription:
			"プレビューは公開済み投稿ページと同じレンダラーを使用します。",
		finalRendering: "最終レンダリング",
		emptyPreview:
			"書き始めると、最終的な投稿レンダリングがここに表示されます。",
		editorWordCount: (count: number) => `${count} 語`,
		editorReadTime: (count: number) => `${count} 分で読了`,
		editorCharacters: (used: number, max: number) => `${used}/${max} 文字`,
		imagesInserted: (count: number) =>
			`${count} ${count === 1 ? "枚の画像を" : "枚の画像を"} markdown に挿入しました。`,
		imageDefaultAlt: "画像",
		imageUploadError: "画像をアップロードできません。",
		translationEyebrow: "Translations",
		translationTitle: "Add or update a localized version",
		translationDescription:
			"Translations override the title, description, thumbnail alt text, and body when a reader is browsing in that language. The slug, tags, and status stay tied to the original post.",
		translationOriginalLanguage: "Original post language",
		translationNoLocales:
			"All supported site languages are already covered by the original post or the saved translations.",
		translationLanguage: "Translation language",
		translationLanguageHelp:
			"Choose the site language that should receive this localized version.",
		translationExisting: "Available translations",
		translationNoneYet: "No translations saved yet.",
		translationStatusExisting: "Editing saved translation",
		translationStatusNew: "Creating new translation",
		translationCopyFromOriginal: "Copy original text",
		translationCopiedFromOriginal:
			"Original post content copied into the translation editor.",
		translationBodyDescription:
			"Write the translated markdown that should replace the original body for this language.",
		translationSave: "Save translation",
		translationSaving: "Saving translation...",
		translationSaveSuccess: "Translation saved.",
		translationSaveError:
			"Unable to save the translation right now. Please try again.",
		translationMustDiffer:
			"Choose a language different from the original post.",
		progressAria: (progress: number, remaining: number) =>
			`${progress}% 進行中、残り ${remaining} 分`,
	},
	postValidation: {
		localeRequired: "Post language is required.",
		imageRequired: "画像は必須です。",
		imageInvalid:
			"画像はアップロード済みファイルパスまたは有効な URL である必要があります。",
		tagEmpty: "タグを空にはできません。",
		tagMaxLength: (max: number) =>
			`タグは ${max} 文字以下である必要があります。`,
		titleMin: "タイトルは 3 文字以上必要です。",
		titleMax: (max: number) =>
			`タイトルは ${max} 文字以下である必要があります。`,
		slugMax: (max: number) => `Slug は ${max} 文字以下である必要があります。`,
		slugInvalid: "Slug に使えるのは小文字、数字、ハイフンのみです。",
		contentMin: "本文は 30 文字以上必要です。",
		contentMax: (max: number) => `本文は ${max} 文字以下である必要があります。`,
		thumbnailAltMax: (max: number) =>
			`サムネイル代替テキストは ${max} 文字以下である必要があります。`,
		mainTagRequired: "メインタグは必須です。",
		tagsRequired: "少なくとも 1 つのタグが必要です。",
		tagsMaxItems: (max: number) => `タグは最大 ${max} 個までです。`,
		tagsUnique: "タグは重複できません。",
		descriptionMax: (max: number) =>
			`説明は ${max} 文字以下である必要があります。`,
	},
	post: {
		relatedReading: "関連する読み物",
		moreFromThisLane: "この系統の続きを見る",
		statusPublished: "公開済み",
		statusPendingReview: "レビュー待ち",
		statusDraft: "下書き",
		translatedToCurrentLanguage: "Translated to your current language",
		translationFromLanguage: (language: string) =>
			`Originally written in ${language}`,
		writtenBy: "著者",
		editPost: "投稿を編集",
		edit: "編集",
		authorProfile: "著者プロフィール",
		moreIn: (tag: string) => `${tag} の続きを読む`,
		authorDescription: (
			name: string,
			mainTag: string,
			relatedTopics: string[],
		) =>
			relatedTopics.length > 0
				? `${name} は ${mainTag} を中心に書き、${relatedTopics.join(" と ")} にも繰り返し触れています。`
				: `${name} は ${mainTag} を中心に書いています。`,
		commentSection: "コメント欄",
		commentPlaceholder: "コメントを追加",
		commentAs: (name: string) => `${name} としてコメント`,
		loginRequiredToComment: "コメントするにはログインが必要です",
		comment: "コメントする",
		postedOn: (date: string) => `${date} に投稿`,
		reportComment: "コメントを報告",
		loginModalTitle: "この操作にはログインが必要です。",
		loginModalDescription:
			"ログインするとより良い体験になります。会話に参加しましょう。",
		reportCommentTitle: "コメントを報告",
		reportingCommentBy: (author: string) => `${author} のコメントを報告中:`,
		reason: "理由",
		chooseReason: "理由を選択...",
		details: "詳細",
		detailsOptional: "詳細（任意）",
		detailsMin: (min: number) => `詳細（最低 ${min} 文字）`,
		describeIssue: "問題を説明してください...",
		addContext: "補足を追加（任意）...",
		submitReport: "報告を送信",
		submitting: "送信中...",
		reportValidation: "必須項目をすべて入力してください。",
	},
	authValidation: {
		emailRequired: "メールアドレスは必須です。",
		emailInvalid: "有効なメールアドレスを入力してください。",
		passwordTooLong: (max: number) =>
			`パスワードは ${max} 文字以下である必要があります。`,
		passwordRequired: "パスワードは必須です。",
		passwordTooShort: "パスワードは8文字以上必要です。",
		nameTooShort: "名前は2文字以上必要です。",
		nameTooLong: "名前は 60 文字以下である必要があります。",
		confirmPasswordRequired: "パスワード確認を入力してください。",
		passwordsDoNotMatch: "パスワードが一致しません。",
		currentPasswordRequired: "現在のパスワードは必須です。",
		newPasswordRequired: "新しいパスワードは必須です。",
		confirmNewPasswordRequired: "新しいパスワードの確認を入力してください。",
	},
} as unknown as typeof dictionaries.en;

export function getMessages(locale: Locale): MessageDictionary {
	if (locale === "de") {
		return germanMessages as unknown as MessageDictionary;
	}

	if (locale === "ru") {
		return russianMessages as unknown as MessageDictionary;
	}

	if (locale === "fr") {
		return frenchMessages as unknown as MessageDictionary;
	}

	if (locale === "ja") {
		return japaneseMessages as unknown as MessageDictionary;
	}

	return dictionaries[locale] as unknown as MessageDictionary;
}
