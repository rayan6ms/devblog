import { cookies, headers } from "next/headers";
import {
	DEFAULT_LOCALE,
	LOCALE_COOKIE,
	LOCALE_HEADER,
	type Locale,
	resolveLocale,
} from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
	const headerStore = await headers();
	const cookieStore = await cookies();

	return (
		resolveLocale(headerStore.get(LOCALE_HEADER)) ||
		resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value) ||
		DEFAULT_LOCALE
	);
}
