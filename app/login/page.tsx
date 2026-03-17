"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getProviders, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
	FaArrowRight,
	FaEye,
	FaEyeSlash,
	FaGithub,
	FaGoogle,
	FaSpinner,
} from "react-icons/fa6";
import PhaserBackground from "@/PhaserBackground";
import { emitClientAuthChange } from "@/components/useClientAuth";
import { type LoginFormValues, loginSchema } from "@/lib/validation/auth";
import SocialAuthButton from "./SocialAuthButton";

const SOCIAL_AUTH_OPTIONS = [
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
] as const;

export default function LoginForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [submissionError, setSubmissionError] = useState("");
	const [providerIds, setProviderIds] = useState<string[]>([]);
	const router = useRouter();
	const { status } = useSession();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	useEffect(() => {
		if (status === "authenticated") {
			router.replace("/profile/me");
		}
	}, [router, status]);

	useEffect(() => {
		let cancelled = false;

		const loadProviders = async () => {
			const providers = await getProviders();
			if (!cancelled) {
				setProviderIds(
					Object.keys(providers || {}).filter(
						(provider) => provider !== "credentials",
					),
				);
			}
		};

		void loadProviders();

		return () => {
			cancelled = true;
		};
	}, []);

	const enabledSocialProviders = useMemo(
		() =>
			SOCIAL_AUTH_OPTIONS.filter((option) =>
				providerIds.includes(option.provider),
			),
		[providerIds],
	);

	async function onSubmit(values: LoginFormValues) {
		setSubmissionError("");

		try {
			const result = await signIn("credentials", {
				email: values.email,
				password: values.password,
				redirect: false,
				callbackUrl: "/profile/me",
			});

			if (result?.error) {
				setSubmissionError("Invalid email or password.");
				return;
			}

			emitClientAuthChange();
			router.push(result?.url || "/profile/me");
			router.refresh();
		} catch (submissionError) {
			console.error(submissionError);
			setSubmissionError("Unable to login right now.");
		}
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-darkBg text-gray">
			<div className="absolute inset-0">
				<PhaserBackground />
			</div>
			<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,23,26,0.22),rgba(20,23,26,0.58))]" />
			<div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="w-full max-w-[420px] rounded-[28px] border border-zinc-200/15 bg-darkBg/58 p-6 shadow-2xl shadow-zinc-950/30 backdrop-blur-md sm:p-7"
					noValidate
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
							<label
								htmlFor="email"
								className="mb-2 block text-sm text-zinc-300"
							>
								Email
							</label>
							<input
								type="email"
								id="email"
								{...register("email")}
								className="w-full rounded-xl border border-zinc-500/45 bg-darkBg/75 px-4 py-3 text-zinc-200 outline-none transition-colors focus:border-purpleContrast"
								aria-invalid={errors.email ? "true" : "false"}
							/>
							{errors.email ? (
								<p className="mt-2 text-sm text-red-400">
									{errors.email.message}
								</p>
							) : null}
						</div>

						<div>
							<label
								htmlFor="password"
								className="mb-2 block text-sm text-zinc-300"
							>
								Password
							</label>
							<div className="relative flex items-center rounded-xl border border-zinc-500/45 bg-darkBg/75">
								<input
									type={showPassword ? "text" : "password"}
									id="password"
									{...register("password")}
									className="w-full bg-transparent px-4 py-3 pr-12 text-zinc-200 outline-none"
									aria-invalid={errors.password ? "true" : "false"}
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
							{errors.password ? (
								<p className="mt-2 text-sm text-red-400">
									{errors.password.message}
								</p>
							) : null}
						</div>
					</div>

					{submissionError ? (
						<p className="mt-3 text-sm text-red-400">{submissionError}</p>
					) : null}

					{enabledSocialProviders.length > 0 ? (
						<div className="mt-6 grid grid-cols-2 gap-3">
							{enabledSocialProviders.map((option) => (
								<SocialAuthButton
									key={option.provider}
									provider={option.provider}
									icon={option.icon}
									bgColor={option.bgColor}
									hoverBgColor={option.hoverBgColor}
								/>
							))}
						</div>
					) : null}

					<div className="mt-8 flex flex-col gap-4">
						<button
							type="submit"
							className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-600/70 bg-purpleContrast px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-purpleContrast/85 disabled:cursor-not-allowed disabled:bg-zinc-700/70 disabled:text-zinc-400"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
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
