"use client";

import { signIn } from "next-auth/react";
import type { IconType } from "react-icons";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";

type SocialAuthButtonProps = {
	provider: string;
	icon: IconType;
	callbackUrl?: string;
};

export default function SocialAuthButton({
	provider,
	icon: Icon,
	callbackUrl = "/profile/me",
}: SocialAuthButtonProps) {
	const { localizeHref } = useLocaleNavigation();

	return (
		<button
			type="button"
			onClick={() =>
				signIn(provider, { callbackUrl: localizeHref(callbackUrl) })
			}
			className="ui-button w-full"
		>
			<Icon aria-hidden="true" />
			{provider === "github" ? "GitHub" : "Google"}
		</button>
	);
}
