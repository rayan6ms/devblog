"use client";

import {
	startTransition,
	useEffect,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
} from "react";
import {
	cloneShellState,
	createShellState,
	executeLine,
	getCommandNames,
	getPrompt,
	welcomeMessage,
	type ShellState,
} from "./commands";

type TranscriptEntry = {
	id: number;
	prompt?: string;
	command?: string;
	output?: string;
	isError?: boolean;
};

const MAX_TRANSCRIPT_ENTRIES = 80;

function createWelcomeEntry(): TranscriptEntry {
	return {
		id: 0,
		output: welcomeMessage,
	};
}

function getCompletionSuffix(value: string) {
	if (!value || /\s/.test(value)) {
		return "";
	}

	const match = getCommandNames().find((command) => command.startsWith(value));
	return match ? match.slice(value.length) : "";
}

export default function Terminal() {
	const [shellState, setShellState] = useState<ShellState>(() => createShellState());
	const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => [
		createWelcomeEntry(),
	]);
	const [input, setInput] = useState("");
	const [suggestion, setSuggestion] = useState("");
	const [historyIndex, setHistoryIndex] = useState<number | null>(null);
	const entryCounterRef = useRef(1);
	const scrollViewportRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const viewport = scrollViewportRef.current;
		if (!viewport) {
			return;
		}

		viewport.scrollTop = viewport.scrollHeight;
	}, [transcript]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	function syncInput(nextValue: string) {
		setInput(nextValue);
		setSuggestion(getCompletionSuffix(nextValue));
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const commandText = input.trim();
		if (!commandText) {
			return;
		}

		const nextState = cloneShellState(shellState);
		const prompt = getPrompt(shellState.cwd);
		const result = executeLine(commandText, nextState);
		const nextEntryId = entryCounterRef.current;
		entryCounterRef.current += 1;

		startTransition(() => {
			setShellState(nextState);
			setTranscript((currentTranscript) => {
				if (result.clear) {
					return [];
				}

				const nextEntry: TranscriptEntry = {
					id: nextEntryId,
					prompt,
					command: commandText,
					output: result.output,
					isError: result.error,
				};

				return [...currentTranscript, nextEntry].slice(-MAX_TRANSCRIPT_ENTRIES);
			});
		});

		setHistoryIndex(null);
		syncInput("");
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Tab" && suggestion) {
			event.preventDefault();
			syncInput(`${input}${suggestion}`);
			return;
		}

		if (event.key === "ArrowUp") {
			if (shellState.commandHistory.length === 0) {
				return;
			}

			event.preventDefault();
			const nextIndex =
				historyIndex === null
					? shellState.commandHistory.length - 1
					: Math.max(0, historyIndex - 1);
			setHistoryIndex(nextIndex);
			syncInput(shellState.commandHistory[nextIndex] ?? "");
			return;
		}

		if (event.key === "ArrowDown") {
			if (historyIndex === null) {
				return;
			}

			event.preventDefault();
			const nextIndex = historyIndex + 1;

			if (nextIndex >= shellState.commandHistory.length) {
				setHistoryIndex(null);
				syncInput("");
				return;
			}

			setHistoryIndex(nextIndex);
			syncInput(shellState.commandHistory[nextIndex] ?? "");
		}
	}

	return (
		<div className="flex h-full w-full items-center justify-center">
			<section
				className="flex h-full min-h-[520px] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-emerald-500/20 bg-[#04110c] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
				onClick={() => inputRef.current?.focus()}
			>
				<header className="border-b border-emerald-500/15 bg-[linear-gradient(135deg,rgba(17,94,89,0.18),rgba(4,17,12,0.92))] px-4 py-4 sm:px-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<span className="h-3 w-3 rounded-full bg-rose-400" />
								<span className="h-3 w-3 rounded-full bg-amber-300" />
								<span className="h-3 w-3 rounded-full bg-emerald-400" />
							</div>
							<h2 className="font-mono text-sm uppercase tracking-[0.28em] text-emerald-200/80">
								Interactive Shell
							</h2>
							<p className="font-mono text-xs text-emerald-100/60">
								Session-isolated terminal for the playground modal
							</p>
						</div>

						<div className="grid gap-2 text-left font-mono text-xs text-emerald-100/70 sm:grid-cols-2 lg:text-right">
							<div>
								<p className="uppercase tracking-[0.22em] text-emerald-200/45">
									Location
								</p>
								<p className="mt-1 text-sm text-emerald-100">{getPrompt(shellState.cwd)}</p>
							</div>
							<div>
								<p className="uppercase tracking-[0.22em] text-emerald-200/45">
									Shortcuts
								</p>
								<p className="mt-1 text-sm text-emerald-100">Tab, ArrowUp, ArrowDown</p>
							</div>
						</div>
					</div>
				</header>

				<div
					ref={scrollViewportRef}
					className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.22))] px-4 py-5 sm:px-6"
				>
					<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 font-mono text-sm leading-6 text-emerald-50">
						{transcript.map((entry) => (
							<div key={entry.id} className="space-y-2">
								{entry.command ? (
									<div className="flex flex-wrap items-start gap-x-3 gap-y-1">
										<span className="text-emerald-300">{entry.prompt}</span>
										<span className="break-all text-zinc-100">{entry.command}</span>
									</div>
								) : null}
								{entry.output ? (
									<pre
										className={`whitespace-pre-wrap break-words ${
											entry.isError ? "text-rose-300" : "text-emerald-50/90"
										}`}
									>
										{entry.output}
									</pre>
								) : null}
							</div>
						))}
					</div>
				</div>

				<footer className="border-t border-emerald-500/15 bg-black/20 px-4 py-4 sm:px-6">
					<form onSubmit={handleSubmit}>
						<label className="flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-black/35 px-4 py-3 font-mono text-sm text-zinc-100">
							<span className="shrink-0 text-emerald-300">{getPrompt(shellState.cwd)}</span>
							<span className="grid min-w-0 flex-1">
								<span
									aria-hidden="true"
									className="col-start-1 row-start-1 whitespace-pre-wrap break-all text-emerald-500/45"
								>
									<span className="invisible">{input}</span>
									{suggestion}
								</span>
								<input
									ref={inputRef}
									type="text"
									value={input}
									onChange={(event) => {
										setHistoryIndex(null);
										syncInput(event.target.value);
									}}
									onKeyDown={handleKeyDown}
									className="col-start-1 row-start-1 w-full bg-transparent text-zinc-100 outline-none"
									autoComplete="off"
									autoCapitalize="off"
									autoCorrect="off"
									spellCheck={false}
									autoFocus
								/>
							</span>
						</label>
					</form>
				</footer>
			</section>
		</div>
	);
}
