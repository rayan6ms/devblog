import { signIn } from "next-auth/react";
import type { IconType } from "react-icons";

type SocialAuthButtonProps = {
	provider: string;
	icon: IconType;
	bgColor: string;
	hoverBgColor: string;
};

export default function SocialAuthButton({
	provider,
	icon: Icon,
	bgColor,
	hoverBgColor,
}: SocialAuthButtonProps) {
	return (
		<button
			type="button"
			onClick={() => signIn(provider)}
			className={`flex h-12 w-full items-center justify-center rounded-2xl shadow-md ${bgColor} ${hoverBgColor} text-white transition-colors duration-300`}
		>
			<Icon />
		</button>
	);
}
