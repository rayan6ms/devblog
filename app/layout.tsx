import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import AuthProvider from "@/components/AuthProvider";
import Header from "@/components/Header";
import LocaleProvider from "@/components/LocaleProvider";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/auth";
import { getRequestLocale } from "@/lib/request-locale";
import {
	getMetadataBase,
	getSiteUrl,
	SITE_DESCRIPTION,
	SITE_NAME,
	serializeJsonLd,
} from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });
const somerton = localFont({
	src: "./SomertonDense-Regular.otf",
	variable: "--font-somerton",
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: getMetadataBase(),
	title: {
		default: SITE_NAME,
		template: `%s | ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	category: "technology",
	openGraph: {
		type: "website",
		url: getSiteUrl(),
		siteName: SITE_NAME,
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		images: ["/opengraph-image"],
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		creator: "@rayan6ms",
		images: ["/twitter-image"],
	},
};

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth();
	const locale = await getRequestLocale();
	const websiteJsonLd = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		description: SITE_DESCRIPTION,
		url: getSiteUrl(),
		inLanguage: locale,
		potentialAction: {
			"@type": "SearchAction",
			target: `${getSiteUrl()}/search?q={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	};

	return (
		<html lang={locale}>
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: serializeJsonLd(websiteJsonLd),
					}}
				/>
			</head>
			<body className={`${inter.className} ${somerton.variable}`}>
				<LocaleProvider initialLocale={locale}>
					<AuthProvider session={session}>
						<Header />
						<NavBar />
						{children}
					</AuthProvider>
				</LocaleProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
