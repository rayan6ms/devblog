"use client";

import { useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	getMessages,
	LOCALE_QUERY_PARAM,
	type Locale,
	resolveLocale,
} from "@/lib/i18n";

type LocaleContextValue = {
	locale: Locale;
	messages: ReturnType<typeof getMessages>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export default function LocaleProvider({
	children,
	initialLocale,
}: {
	children: ReactNode;
	initialLocale: Locale;
}) {
	const searchParams = useSearchParams();
	const locale =
		resolveLocale(searchParams.get(LOCALE_QUERY_PARAM)) || initialLocale;
	const value = useMemo(
		() => ({
			locale,
			messages: getMessages(locale),
		}),
		[locale],
	);

	return (
		<LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
	);
}

export function useI18n() {
	const context = useContext(LocaleContext);

	if (!context) {
		throw new Error("useI18n must be used within LocaleProvider.");
	}

	return context;
}
