"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getProviders, signIn, useSession } from "next-auth/react";
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
import { useI18n } from "@/components/LocaleProvider";
import { emitClientAuthChange } from "@/components/useClientAuth";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import {
	createRegisterFormSchema,
	type RegisterFormValues,
} from "@/lib/validation/auth";
import PhaserBackground from "@/PhaserBackground";
import SocialAuthButton from "../login/SocialAuthButton";

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

export default function RegisterForm() {
	const { messages } = useI18n();
	const [showPassword, setShowPassword] = useState(false);
	const [submissionError, setSubmissionError] = useState("");
	const [providerIds, setProviderIds] = useState<string[]>([]);
	const { push, replace, localizeHref } = useLocaleNavigation();
	const { status } = useSession();
	const registerFormSchema = useMemo(
		() => createRegisterFormSchema(messages.authValidation),
		[messages.authValidation],
	);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<RegisterFormValues>({
		resolver: zodResolver(registerFormSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	useEffect(() => {
		if (status === "authenticated") {
			replace("/profile/me");
		}
	}, [replace, status]);

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

	async function onSubmit(values: RegisterFormValues) {
		setSubmissionError("");

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: values.name,
					email: values.email,
					password: values.password,
				}),
			});

			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as {
					error?: string;
					fields?: Partial<Record<keyof RegisterFormValues, string[]>>;
				} | null;

				for (const field of [
					"name",
					"email",
					"password",
					"confirmPassword",
				] as const) {
					const message = result?.fields?.[field]?.[0];
					if (message) {
						setError(field, { type: "server", message });
					}
				}

				setSubmissionError(
					result?.error || messages.register.unableToCreateShort,
				);
				return;
			}

			const signInResult = await signIn("credentials", {
				email: values.email,
				password: values.password,
				redirect: false,
				callbackUrl: localizeHref("/profile/me"),
			});

			if (signInResult?.error) {
				setSubmissionError(messages.register.accountCreatedLoginFailed);
				push("/login");
				return;
			}

			emitClientAuthChange();
			push(signInResult?.url || "/profile/me");
		} catch (submissionError) {
			console.error(submissionError);
			setSubmissionError(messages.register.unableToCreate);
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
							{messages.register.eyebrow}
						</p>
						<h1 className="mt-3 text-3xl font-somerton uppercase text-wheat">
							{messages.register.title}
						</h1>
					</div>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="name"
								className="mb-2 block text-sm text-zinc-300"
							>
								{messages.register.name}
							</label>
							<input
								type="text"
								id="name"
								{...register("name")}
								className="w-full rounded-xl border border-zinc-500/45 bg-darkBg/75 px-4 py-3 text-zinc-200 outline-none transition-colors focus:border-purpleContrast"
								aria-invalid={errors.name ? "true" : "false"}
							/>
							{errors.name ? (
								<p className="mt-2 text-sm text-red-400">
									{errors.name.message}
								</p>
							) : null}
						</div>

						<div>
							<label
								htmlFor="email"
								className="mb-2 block text-sm text-zinc-300"
							>
								{messages.register.email}
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
								{messages.register.password}
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
									aria-label={
										showPassword
											? messages.register.hidePassword
											: messages.register.showPassword
									}
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

						<div>
							<label
								htmlFor="confirm-password"
								className="mb-2 block text-sm text-zinc-300"
							>
								{messages.register.confirmPassword}
							</label>
							<input
								type={showPassword ? "text" : "password"}
								id="confirm-password"
								{...register("confirmPassword")}
								className="w-full rounded-xl border border-zinc-500/45 bg-darkBg/75 px-4 py-3 text-zinc-200 outline-none transition-colors focus:border-purpleContrast"
								aria-invalid={errors.confirmPassword ? "true" : "false"}
							/>
							{errors.confirmPassword ? (
								<p className="mt-2 text-sm text-red-400">
									{errors.confirmPassword.message}
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
							{messages.register.createAccount}
						</button>
						<p className="text-center text-sm text-zinc-300">
							{messages.register.haveAccount}
							<button
								type="button"
								className="ml-1 underline underline-offset-4 transition-colors hover:text-wheat"
								onClick={() => push("/login")}
							>
								{messages.register.login}
							</button>
						</p>
					</div>
				</form>
			</div>
		</div>
	);
}
