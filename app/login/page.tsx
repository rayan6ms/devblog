"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	FaArrowRight,
	FaDiscord,
	FaEye,
	FaEyeSlash,
	FaFacebook,
	FaGithub,
	FaGoogle,
	FaSpinner,
} from "react-icons/fa6";
import P5Background from "@/P5Background";
import SocialAuthButton from "./SocialAuthButton";

export default function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const socialAuthOptions = [
		{
			provider: "google",
			icon: FaGoogle,
			bgColor: "bg-slate-700",
			hoverBgColor: "hover:bg-slate-800/60 border border-gray-600/60",
		},
		{
			provider: "github",
			icon: FaGithub,
			bgColor: "bg-gray-800",
			hoverBgColor: "hover:bg-gray-900 border border-gray-700",
		},
		{
			provider: "facebook",
			icon: FaFacebook,
			bgColor: "bg-blue-600",
			hoverBgColor: "hover:bg-blue-700 border border-blue-500/50",
		},
		{
			provider: "discord",
			icon: FaDiscord,
			bgColor: "bg-indigo-500",
			hoverBgColor: "hover:bg-indigo-600 border border-gray-500",
		},
	];

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setIsLoading(true);

		const userSlug = "johann-gottfried";

		try {
			router.push(`/profile/${userSlug}`);
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-darkBg text-gray">
			<div className="absolute inset-0">
				<P5Background />
			</div>
			<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,23,26,0.22),rgba(20,23,26,0.58))]" />
			<div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
				<form
					onSubmit={handleSubmit}
					className="w-full max-w-[420px] rounded-[28px] border border-zinc-200/15 bg-darkBg/58 p-6 shadow-2xl shadow-zinc-950/30 backdrop-blur-md sm:p-7"
				>
					<div className="mb-6 text-center">
						<p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
							Member access
						</p>
						<h1 className="mt-3 text-3xl font-somerton uppercase text-wheat">
							Login
						</h1>
					</div>

					<div className="space-y-4">
						<div>
							<label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
								Email
							</label>
							<input
								type="email"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full rounded-xl border border-zinc-500/45 bg-darkBg/75 px-4 py-3 text-zinc-200 outline-none transition-colors focus:border-purpleContrast"
								required
							/>
						</div>

						<div>
							<label htmlFor="password" className="mb-2 block text-sm text-zinc-300">
								Password
							</label>
							<div className="relative flex items-center rounded-xl border border-zinc-500/45 bg-darkBg/75">
								<input
									type={showPassword ? "text" : "password"}
									id="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full bg-transparent px-4 py-3 pr-12 text-zinc-200 outline-none"
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword((value) => !value)}
									className="absolute right-3 text-zinc-400 transition-colors hover:text-zinc-200"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? <FaEye /> : <FaEyeSlash />}
								</button>
							</div>
						</div>
					</div>

					<div className="mt-6 grid grid-cols-4 gap-3">
						{socialAuthOptions.map((option) => (
							<SocialAuthButton
								key={option.provider}
								provider={option.provider}
								icon={option.icon}
								bgColor={option.bgColor}
								hoverBgColor={option.hoverBgColor}
							/>
						))}
					</div>

					<div className="mt-8 flex flex-col gap-4">
						<button
							type="submit"
							className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-600/70 bg-purpleContrast px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-purpleContrast/85 disabled:cursor-not-allowed disabled:bg-zinc-700/70 disabled:text-zinc-400"
							disabled={!(email && password) || isLoading}
						>
							{isLoading ? (
								<FaSpinner className="animate-spin text-lg" />
							) : (
								<FaArrowRight className="text-lg" />
							)}
							Continue
						</button>
						<p className="text-center text-sm text-zinc-300">
							Don&apos;t have an account?
							<button
								type="button"
								className="ml-1 underline underline-offset-4 transition-colors hover:text-wheat"
								onClick={() => router.push("/register")}
							>
								Register
							</button>
						</p>
					</div>
				</form>
			</div>
		</div>
	);
}
