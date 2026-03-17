"use client";

import { useI18n } from "@/components/LocaleProvider";

type MainTagInputProps = {
	suggestions: string[];
	value: string;
	onChange: (tag: string) => void;
};

export default function MainTagInput({
	suggestions,
	value,
	onChange,
}: MainTagInputProps) {
	const { messages } = useI18n();

	return (
		<div className="grid gap-2">
			<input
				list="main-tag-suggestions"
				type="text"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
				placeholder={messages.newPost.mainTagPlaceholder}
			/>
			<datalist id="main-tag-suggestions">
				{suggestions.map((tag) => (
					<option key={tag} value={tag} />
				))}
			</datalist>
			<p className="text-sm text-zinc-500">{messages.newPost.mainTagHelp}</p>
		</div>
	);
}
