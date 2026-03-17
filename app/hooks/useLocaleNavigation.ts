"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { withLocaleQuery, type Locale } from "@/lib/i18n";
import { useI18n } from "@/components/LocaleProvider";

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

	const localizeHref = useCallback(
		(href: string, nextLocale = locale) =>
			withLocaleQuery(
				buildRelativeHref(
					pathname,
					href,
					currentSearch ? `?${currentSearch}` : "",
				),
				nextLocale,
			),
		[currentSearch, locale, pathname],
	);

	const push = useCallback(
		(href: string, options?: Parameters<typeof router.push>[1]) =>
			router.push(localizeHref(href), options),
		[localizeHref, router],
	);

	const replace = useCallback(
		(href: string, options?: Parameters<typeof router.replace>[1]) =>
			router.replace(localizeHref(href), options),
		[localizeHref, router],
	);

	const replaceWithLocale = useCallback(
		(
			href: string,
			nextLocale: Locale,
			options?: Parameters<typeof router.replace>[1],
		) => router.replace(localizeHref(href, nextLocale), options),
		[localizeHref, router],
	);

	return {
		locale,
		localizeHref,
		push,
		replace,
		replaceWithLocale,
	};
}
