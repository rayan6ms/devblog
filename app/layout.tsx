import "./globals.css";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import AuthProvider from "@/components/AuthProvider";
import Header from "@/components/Header";
import LocaleProvider from "@/components/LocaleProvider";
import NavBar from "@/components/NavBar";
import { auth } from "@/lib/auth";
import { getRequestLocale } from "@/lib/request-locale";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "DevBlog",
	description: "A blog for everyone who loves technology",
};

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth();
	const locale = await getRequestLocale();

	return (
		<html lang={locale}>
			<head>
				<link
					href="https://fonts.cdnfonts.com/css/somerton-dense"
					rel="stylesheet"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className={inter.className}>
				<LocaleProvider initialLocale={locale}>
					<AuthProvider session={session}>
						<Header />
						<NavBar />
						{children}
					</AuthProvider>
				</LocaleProvider>
			</body>
		</html>
	);
}
