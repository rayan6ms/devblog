"use client";

import Link from "next/link";
import { type ComponentProps, forwardRef } from "react";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
	href: string;
};

const LocalizedLink = forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
	function LocalizedLink({ href, ...props }, ref) {
		const { localizeHref } = useLocaleNavigation();

		return <Link ref={ref} href={localizeHref(href)} {...props} />;
	},
);

export default LocalizedLink;
