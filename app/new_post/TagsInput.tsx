"use client";

import type React from "react";
import { useState } from "react";
import { useI18n } from "@/components/LocaleProvider";

type TagsInputProps = {
	value: string[];
	onChange: (tags: string[]) => void;
	maxTags?: number;
};

export default function TagsInput({
	value,
	onChange,
	maxTags = 6,
}: TagsInputProps) {
	const { messages } = useI18n();
	const [input, setInput] = useState("");

	const addTag = (rawTag: string) => {
		const tag = rawTag.trim();
		if (!tag) {
			setInput("");
			return;
		}

		const exists = value.some(
			(existingTag) => existingTag.toLowerCase() === tag.toLowerCase(),
		);
		if (exists || value.length >= maxTags) {
			setInput("");
			return;
		}

		onChange([...value, tag]);
		setInput("");
	};

	const removeTag = (tagToRemove: string) => {
		onChange(value.filter((tag) => tag !== tagToRemove));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" || event.key === "Tab" || event.key === ",") {
			event.preventDefault();
			addTag(input);
		}

		if (event.key === "Backspace" && !input && value.length > 0) {
			removeTag(value[value.length - 1]);
		}
	};

	return (
		<div className="grid gap-3 rounded-[24px] border border-zinc-700/50 bg-darkBg/55 p-3">
			<div className="flex flex-wrap gap-2">
				{value.map((tag) => (
					<button
						key={tag}
						type="button"
						onClick={() => removeTag(tag)}
						className="inline-flex items-center gap-2 rounded-full border border-zinc-600/60 bg-zinc-800/85 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-zinc-500/70 hover:text-wheat"
					>
						<span>{tag}</span>
						<span aria-hidden="true">&times;</span>
					</button>
				))}

				<input
					type="text"
					value={input}
					onChange={(event) => setInput(event.target.value)}
					onKeyDown={handleKeyDown}
					className="min-w-[14rem] flex-1 bg-transparent px-2 py-1.5 text-zinc-100 outline-none placeholder:text-zinc-500"
					placeholder={
						value.length < maxTags
							? messages.newPost.tagsPlaceholder
							: messages.newPost.tagsLimitReached
					}
				/>
			</div>
			<p className="text-sm text-zinc-500">
				{messages.newPost.tagSlotsLeft(maxTags - value.length)}
			</p>
		</div>
	);
}
