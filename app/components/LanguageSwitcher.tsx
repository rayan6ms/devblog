"use client";
import { useId, useRef, type HTMLAttributes } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheck, FaGlobe } from "react-icons/fa6";
import { useLocaleNavigation } from "@/hooks/useLocaleNavigation";
import { localeOptions } from "@/lib/i18n-shared";
import { useI18n } from "./LocaleProvider";
export default function LanguageSwitcher({
	className = "",
	...props
}: HTMLAttributes<HTMLDivElement>) {
	const { locale, messages } = useI18n();
	const { replaceWithLocale } = useLocaleNavigation();
	const searchParams = useSearchParams();
	const id = useId();
	const menu = useRef<HTMLDivElement>(null);
	return (
		<div className={className} {...props}>
			<button
				type="button"
				className="icon-button"
				aria-label={messages.language.ariaLabel}
				popoverTarget={id}
				onClick={(event) => {
					const rect = event.currentTarget.getBoundingClientRect();
					if (menu.current) {
						menu.current.style.left = `${Math.max(12, Math.min(rect.right - 200, innerWidth - 212))}px`;
						menu.current.style.top = `${rect.bottom + 8}px`;
					}
				}}
			>
				<FaGlobe aria-hidden="true" />
			</button>
			<div
				ref={menu}
				popover="auto"
				id={id}
				className="post-actions__menu"
				aria-label={messages.language.menuTitle}
			>
				{localeOptions.map((option) => (
					<button
						type="button"
						key={option.value}
						aria-pressed={option.value === locale}
						onClick={() => {
							menu.current?.hidePopover();
							replaceWithLocale(`?${searchParams.toString()}`, option.value, {
								scroll: false,
							});
						}}
					>
						<span className="flex-1 text-left">{option.label}</span>
						{locale === option.value && <FaCheck aria-hidden="true" />}
					</button>
				))}
			</div>
		</div>
	);
}
