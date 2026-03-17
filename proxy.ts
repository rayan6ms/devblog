import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
	DEFAULT_LOCALE,
	LOCALE_COOKIE,
	LOCALE_HEADER,
	LOCALE_QUERY_PARAM,
	resolveLocale,
} from "@/lib/i18n";

export function proxy(request: NextRequest) {
	const locale =
		resolveLocale(request.nextUrl.searchParams.get(LOCALE_QUERY_PARAM)) ||
		resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value) ||
		DEFAULT_LOCALE;

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set(LOCALE_HEADER, locale);

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});

	if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
		response.cookies.set(LOCALE_COOKIE, locale, {
			maxAge: 60 * 60 * 24 * 365,
			path: "/",
			sameSite: "lax",
		});
	}

	return response;
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
