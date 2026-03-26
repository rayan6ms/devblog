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
