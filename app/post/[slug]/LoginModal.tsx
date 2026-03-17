"use client";

import { FaXmark } from "react-icons/fa6";
import { useI18n } from "@/components/LocaleProvider";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function LoginModal({ isOpen, onClose }: LoginModalProps) {
	const { messages } = useI18n();
	const { push } = useLocaleNavigation();

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 p-4">
			<button
				type="button"
				className="fixed inset-0"
				aria-label={messages.common.close}
				onClick={onClose}
			/>
			<div className="relative flex min-h-full items-start justify-center sm:items-center">
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="login-modal-title"
					className="relative w-11/12 rounded-lg border border-zinc-700/50 bg-darkBg p-10 shadow-md shadow-zinc-900 md:w-[50%] lg:w-[40%] max-h-[calc(100dvh-2rem)] overflow-y-auto"
				>
				<div className="flex justify-between items-center">
					<h2
						id="login-modal-title"
						className="text-xl font-bold mb-3 text-purpleContrast"
					>
						{messages.post.loginModalTitle}
					</h2>
					<button type="button" onClick={onClose}>
						<FaXmark className="w-8 h-8 p-1 text-wheat hover:text-purpleContrast hover:bg-gray-700/50 rounded-xl transition-colors ease-in-out duration-200" />
					</button>
				</div>
				<div className="border-b border-zinc-400 my-3" />
				<h1 className="text-6xl font-somerton ml-2 mb-3">devblog</h1>
				<p className="text-gray mb-8">
					{messages.post.loginModalDescription}
				</p>
				<div className="flex flex-col justify-center items-center gap-4">
					<button
						type="button"
						onClick={() => push("/login")}
						className="bg-purpleContrast/80 hover:bg-purpleContrast hover:brightness-110 text-gray-100 p-2 rounded-md w-5/6 transition duration-300 hover:bg-slate"
					>
						{messages.common.login}
					</button>
					<button
						type="button"
						onClick={() => push("/register")}
						className="bg-lessDarkBg hover:brightness-125 text-gray-100 p-2 rounded-md w-5/6 transition duration-300 hover:bg-slate"
					>
						{messages.register.title}
					</button>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="absolute top-2 right-2 text-gray-100"
					aria-label={messages.common.close}
				>
					&times;
				</button>
				</div>
			</div>
		</div>
	);
}

export default LoginModal;
