"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/LocaleProvider";
import { type Locale, withLocaleQuery } from "@/lib/i18n-shared";

function buildRelativeHref(pathname: string, href: string, search: string) {
	if (href.startsWith("?")) {
		return `${pathname}${href}`;
	}

	if (href.startsWith("#")) {
		return `${pathname}${search}${href}`;
	}

	return href;
}

export function useLocaleNavigation() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { locale } = useI18n();
	const currentSearch = searchParams.toString();

	function localizeHref(href: string, nextLocale = locale) {
		return withLocaleQuery(
			buildRelativeHref(
				pathname,
				href,
				currentSearch ? `?${currentSearch}` : "",
			),
			nextLocale,
		);
	}

	function push(href: string, options?: Parameters<typeof router.push>[1]) {
		router.push(localizeHref(href), options);
	}

	function replace(
		href: string,
		options?: Parameters<typeof router.replace>[1],
	) {
		router.replace(localizeHref(href), options);
	}

	function replaceWithLocale(
		href: string,
		nextLocale: Locale,
		options?: Parameters<typeof router.replace>[1],
	) {
		router.replace(localizeHref(href, nextLocale), options);
	}

	return {
		locale,
		localizeHref,
		push,
		replace,
		replaceWithLocale,
	};
}
