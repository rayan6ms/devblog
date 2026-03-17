import { signIn } from "next-auth/react";
import type { IconType } from "react-icons";

type SocialAuthButtonProps = {
	provider: string;
	icon: IconType;
	bgColor: string;
	hoverBgColor: string;
	callbackUrl?: string;
};

export default function SocialAuthButton({
	provider,
	icon: Icon,
	bgColor,
	hoverBgColor,
	callbackUrl = "/profile/me",
}: SocialAuthButtonProps) {
	return (
		<button
			type="button"
			onClick={() => signIn(provider, { callbackUrl })}
			className={`flex h-12 w-full items-center justify-center rounded-2xl shadow-md ${bgColor} ${hoverBgColor} text-white transition-colors duration-300`}
		>
			<Icon />
		</button>
	);
}
