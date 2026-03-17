"use client";

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
	return (
		<div className="grid gap-2">
			<input
				list="main-tag-suggestions"
				type="text"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-12 w-full rounded-2xl border border-zinc-700/50 bg-darkBg/55 px-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-purpleContrast/45"
				placeholder="Pick an existing topic or define a new main tag"
			/>
			<datalist id="main-tag-suggestions">
				{suggestions.map((tag) => (
					<option key={tag} value={tag} />
				))}
			</datalist>
			<p className="text-sm text-zinc-500">
				Main tags group the post across listings and recommendations.
			</p>
		</div>
	);
}
