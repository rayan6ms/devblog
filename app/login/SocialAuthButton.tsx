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
			className={`flex items-center justify-center w-full p-2 rounded-md shadow-md mb-2 ${bgColor} ${hoverBgColor} text-white transition-colors duration-300`}
		>
			<Icon />
		</button>
	);
}
