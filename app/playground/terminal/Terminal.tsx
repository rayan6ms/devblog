"use client";

import {
	type CSSProperties,
	type FormEvent,
	type KeyboardEvent,
	startTransition,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	cloneShellState,
	createShellState,
	executeLine,
	getCommandNames,
	getPrompt,
	type ShellState,
	welcomeMessage,
} from "./commands";
import { getNodeAtPath, isDirectory, resolvePath, tokenizeInput } from "./utils";

type TranscriptEntry = {
	id: number;
	prompt?: string;
	command?: string;
	output?: string;
	isError?: boolean;
};

type TerminalTheme = {
	id: string;
	name: string;
	canvas: string;
	panel: string;
	panelAlt: string;
	border: string;
	text: string;
	muted: string;
	accent: string;
	error: string;
	shadow: string;
};

const MAX_TRANSCRIPT_ENTRIES = 80;
const THEME_STORAGE_KEY = "playground-terminal-theme";
const TERMINAL_FONT_STACK =
	'"IBM Plex Mono", "JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, monospace';

const THEMES: TerminalTheme[] = [
	{
		id: "green",
		name: "Green",
		canvas:
			"radial-gradient(circle at top right, rgba(72, 255, 125, 0.06), transparent 28%), linear-gradient(180deg, #0a0f0b 0%, #060806 100%)",
		panel: "rgba(9, 13, 10, 0.96)",
		panelAlt: "rgba(14, 19, 15, 0.98)",
		border: "rgba(115, 255, 154, 0.14)",
		text: "#eaf8ed",
		muted: "rgba(194, 221, 199, 0.62)",
		accent: "#78f08e",
		error: "#ff9da8",
		shadow: "rgba(0, 0, 0, 0.28)",
	},
	{
		id: "amber",
		name: "Amber",
		canvas:
			"radial-gradient(circle at top right, rgba(255, 184, 77, 0.06), transparent 28%), linear-gradient(180deg, #110d09 0%, #080604 100%)",
		panel: "rgba(14, 11, 8, 0.96)",
		panelAlt: "rgba(19, 15, 11, 0.98)",
		border: "rgba(255, 194, 102, 0.14)",
		text: "#fff4de",
		muted: "rgba(235, 214, 176, 0.62)",
		accent: "#ffc26b",
		error: "#ffae97",
		shadow: "rgba(0, 0, 0, 0.3)",
	},
	{
		id: "ice",
		name: "Ice",
		canvas:
			"radial-gradient(circle at top right, rgba(95, 215, 255, 0.06), transparent 28%), linear-gradient(180deg, #091017 0%, #05080d 100%)",
		panel: "rgba(9, 13, 18, 0.96)",
		panelAlt: "rgba(13, 18, 24, 0.98)",
		border: "rgba(118, 221, 255, 0.14)",
		text: "#eefaff",
		muted: "rgba(190, 217, 229, 0.62)",
		accent: "#7edfff",
		error: "#ffafba",
		shadow: "rgba(0, 0, 0, 0.3)",
	},
	{
		id: "rose",
		name: "Rose",
		canvas:
			"radial-gradient(circle at top right, rgba(255, 117, 166, 0.05), transparent 28%), linear-gradient(180deg, #130a10 0%, #080509 100%)",
		panel: "rgba(16, 10, 14, 0.96)",
		panelAlt: "rgba(21, 13, 18, 0.98)",
		border: "rgba(255, 150, 189, 0.14)",
		text: "#fff0f6",
		muted: "rgba(233, 196, 210, 0.62)",
		accent: "#ff9cc0",
		error: "#ffb692",
		shadow: "rgba(0, 0, 0, 0.3)",
	},
	{
		id: "dracula",
		name: "Dracula",
		canvas:
			"radial-gradient(circle at top right, rgba(189, 147, 249, 0.08), transparent 28%), linear-gradient(180deg, #17141f 0%, #111019 100%)",
		panel: "rgba(24, 21, 34, 0.97)",
		panelAlt: "rgba(31, 28, 43, 0.98)",
		border: "rgba(189, 147, 249, 0.17)",
		text: "#f8f8f2",
		muted: "rgba(198, 201, 255, 0.62)",
		accent: "#bd93f9",
		error: "#ff6b8a",
		shadow: "rgba(0, 0, 0, 0.34)",
	},
	{
		id: "nord",
		name: "Nord",
		canvas:
			"radial-gradient(circle at top right, rgba(136, 192, 208, 0.07), transparent 28%), linear-gradient(180deg, #0f1620 0%, #0a1017 100%)",
		panel: "rgba(15, 24, 33, 0.97)",
		panelAlt: "rgba(21, 32, 44, 0.98)",
		border: "rgba(136, 192, 208, 0.16)",
		text: "#e5eef6",
		muted: "rgba(188, 205, 219, 0.62)",
		accent: "#88c0d0",
		error: "#ef8f8f",
		shadow: "rgba(0, 0, 0, 0.33)",
	},
	{
		id: "solarized",
		name: "Solarized",
		canvas:
			"radial-gradient(circle at top right, rgba(181, 137, 0, 0.06), transparent 28%), linear-gradient(180deg, #09242c 0%, #06181e 100%)",
		panel: "rgba(8, 32, 40, 0.97)",
		panelAlt: "rgba(12, 42, 52, 0.98)",
		border: "rgba(147, 161, 161, 0.17)",
		text: "#eee8d5",
		muted: "rgba(174, 189, 189, 0.62)",
		accent: "#b58900",
		error: "#dc5b64",
		shadow: "rgba(0, 0, 0, 0.33)",
	},
];

const EXAMPLE_COMMANDS = [
	"help",
	"ls -la",
	"tree",
	"pwd",
	"cd Documents",
	"cat .bashrc",
	"tree Workspace",
	"ls Workspace/client/mockups",
	"find . file1",
	"history",
	"date",
	"whoami",
	"cat Workspace/client/brief.txt",
	"echo hello world",
	"touch demo.txt",
];

type CompletionResult = {
	matches: string[];
	nextInput: string;
	suggestion: string;
};

function createWelcomeEntry(): TranscriptEntry {
	return {
		id: 0,
		output: welcomeMessage,
	};
}

function getCompletionContext(input: string) {
	const tokens = tokenizeInput(input);
	const endsWithWhitespace = /\s$/.test(input);

	if (endsWithWhitespace) {
		return {
			tokens,
			leading: input,
			fragment: "",
			tokenIndex: tokens.length,
		};
	}

	const fragmentMatch = input.match(/(\S+)$/);
	const fragment = fragmentMatch?.[1] ?? "";

	return {
		tokens,
		leading: input.slice(0, input.length - fragment.length),
		fragment,
		tokenIndex: Math.max(tokens.length - 1, 0),
	};
}

function getCommandMatches(value: string) {
	return getCommandNames()
		.filter((command) => command.startsWith(value))
		.sort((left, right) => left.localeCompare(right));
}

function getLongestCommonPrefix(values: string[]) {
	if (values.length === 0) {
		return "";
	}

	let prefix = values[0] ?? "";

	for (const value of values.slice(1)) {
		while (prefix && !value.startsWith(prefix)) {
			prefix = prefix.slice(0, -1);
		}
	}

	return prefix;
}

function buildCommandCompletion(input: string): CompletionResult {
	const { leading, fragment } = getCompletionContext(input);
	const matches = getCommandMatches(fragment);

	if (matches.length === 0) {
		return { matches: [], nextInput: input, suggestion: "" };
	}

	if (matches.length === 1) {
		const nextInput = `${leading}${matches[0]} `;
		return {
			matches,
			nextInput,
			suggestion: nextInput.slice(input.length),
		};
	}

	const commonPrefix = getLongestCommonPrefix(matches);
	const nextInput =
		commonPrefix.length > fragment.length ? `${leading}${commonPrefix}` : input;

	return {
		matches,
		nextInput,
		suggestion: nextInput.startsWith(input) ? nextInput.slice(input.length) : "",
	};
}

function buildPathCompletion(input: string, shellState: ShellState): CompletionResult {
	const { leading, fragment } = getCompletionContext(input);

	if (fragment.startsWith("-")) {
		return { matches: [], nextInput: input, suggestion: "" };
	}

	const lastSlashIndex = fragment.lastIndexOf("/");
	const baseFragment = lastSlashIndex >= 0 ? fragment.slice(0, lastSlashIndex + 1) : "";
	const nameFragment = lastSlashIndex >= 0 ? fragment.slice(lastSlashIndex + 1) : fragment;
	const resolvedBase = baseFragment.endsWith("/")
		? baseFragment.slice(0, -1)
		: baseFragment;
	const parentPath = resolvePath(shellState.cwd, resolvedBase || ".");
	const parentNode = getNodeAtPath(shellState.fileSystem, parentPath);

	if (!isDirectory(parentNode)) {
		return { matches: [], nextInput: input, suggestion: "" };
	}

	const showHidden = nameFragment.startsWith(".");
	const matches = Object.entries(parentNode.contents)
		.filter(([name, child]) => {
			if (!showHidden && child.hidden) {
				return false;
			}

			return name.startsWith(nameFragment);
		})
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([name, child]) => ({
			display: `${baseFragment}${name}${child.type === "directory" ? "/" : ""}`,
			nextInput: `${leading}${baseFragment}${name}${child.type === "directory" ? "/" : " "}`,
		}));

	if (matches.length === 0) {
		return { matches: [], nextInput: input, suggestion: "" };
	}

	if (matches.length === 1) {
		return {
			matches: matches.map((match) => match.display),
			nextInput: matches[0]?.nextInput ?? input,
			suggestion: (matches[0]?.nextInput ?? input).slice(input.length),
		};
	}

	const commonPrefix = getLongestCommonPrefix(matches.map((match) => match.display));
	const nextInput =
		commonPrefix.length > fragment.length ? `${leading}${commonPrefix}` : input;

	return {
		matches: matches.map((match) => match.display),
		nextInput,
		suggestion: nextInput.startsWith(input) ? nextInput.slice(input.length) : "",
	};
}

function getCompletion(input: string, shellState: ShellState): CompletionResult {
	const context = getCompletionContext(input);

	if (context.tokenIndex === 0 && context.leading.trim().length === 0) {
		return buildCommandCompletion(input);
	}

	return buildPathCompletion(input, shellState);
}

function getThemeStyle(theme: TerminalTheme): CSSProperties {
	return {
		fontFamily: TERMINAL_FONT_STACK,
		background: theme.canvas,
		boxShadow: `0 18px 48px ${theme.shadow}`,
		"--term-panel": theme.panel,
		"--term-panel-alt": theme.panelAlt,
		"--term-border": theme.border,
		"--term-text": theme.text,
		"--term-muted": theme.muted,
		"--term-accent": theme.accent,
		"--term-error": theme.error,
	} as CSSProperties;
}

export default function Terminal() {
	const [shellState, setShellState] = useState<ShellState>(() => createShellState());
	const [transcript, setTranscript] = useState<TranscriptEntry[]>(() => [
		createWelcomeEntry(),
	]);
	const [input, setInput] = useState("");
	const [suggestion, setSuggestion] = useState("");
	const [historyIndex, setHistoryIndex] = useState<number | null>(null);
	const [themeIndex, setThemeIndex] = useState(0);
	const [isInputFocused, setIsInputFocused] = useState(false);
	const entryCounterRef = useRef(1);
	const scrollViewportRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const tabStateRef = useRef<{ input: string | null; listed: boolean }>({
		input: null,
		listed: false,
	});
	const currentTheme = THEMES[themeIndex] ?? THEMES[0];

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

	useEffect(() => {
		const storedThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);

		if (!storedThemeId) {
			return;
		}

		const storedIndex = THEMES.findIndex((theme) => theme.id === storedThemeId);
		if (storedIndex >= 0) {
			setThemeIndex(storedIndex);
		}
	}, []);

	useEffect(() => {
		window.localStorage.setItem(THEME_STORAGE_KEY, currentTheme.id);
	}, [currentTheme.id]);

	useEffect(() => {
		setSuggestion(getCompletion(input, shellState).suggestion);
	}, [input, shellState]);

	function resetTabState() {
		tabStateRef.current = {
			input: null,
			listed: false,
		};
	}

	function syncInput(nextValue: string, resetCompletion = true) {
		setInput(nextValue);
		setSuggestion(getCompletion(nextValue, shellState).suggestion);

		if (resetCompletion) {
			resetTabState();
		}
	}

	function focusInput() {
		inputRef.current?.focus();
	}

	function appendOutput(output: string, isError = false) {
		if (!output) {
			return;
		}

		const nextEntryId = entryCounterRef.current;
		entryCounterRef.current += 1;

		startTransition(() => {
			setTranscript((currentTranscript) =>
				[
					...currentTranscript,
					{
						id: nextEntryId,
						output,
						isError,
					},
				].slice(-MAX_TRANSCRIPT_ENTRIES),
			);
		});
	}

	function runCommand(rawCommand: string) {
		resetTabState();

		const commandText = rawCommand.trim();
		if (!commandText) {
			focusInput();
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
		focusInput();
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		runCommand(input);
	}

	function handleTab(event: KeyboardEvent<HTMLInputElement>) {
		event.preventDefault();

		const selectionStart = event.currentTarget.selectionStart ?? input.length;
		const selectionEnd = event.currentTarget.selectionEnd ?? input.length;

		if (selectionStart !== input.length || selectionEnd !== input.length) {
			return;
		}

		const completion = getCompletion(input, shellState);
		if (completion.matches.length === 0) {
			return;
		}

		if (completion.matches.length === 1) {
			syncInput(completion.nextInput);
			return;
		}

		if (completion.nextInput.length > input.length) {
			syncInput(completion.nextInput, false);
			tabStateRef.current = {
				input: completion.nextInput,
				listed: false,
			};
			return;
		}

		if (tabStateRef.current.input === input && !tabStateRef.current.listed) {
			appendOutput(completion.matches.join("    "));
			tabStateRef.current = {
				input,
				listed: true,
			};
			return;
		}

		tabStateRef.current = {
			input,
			listed: false,
		};
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.ctrlKey && event.key.toLowerCase() === "l") {
			event.preventDefault();
			runCommand("clear");
			return;
		}

		if (event.key === "Tab") {
			handleTab(event);
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
			syncInput(shellState.commandHistory[nextIndex] ?? "", false);
			resetTabState();
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
			syncInput(shellState.commandHistory[nextIndex] ?? "", false);
			resetTabState();
		}
	}

	function cycleTheme() {
		setThemeIndex((currentIndex) => (currentIndex + 1) % THEMES.length);
	}

	return (
		<div className="flex h-full w-full">
			<section
				style={getThemeStyle(currentTheme)}
				className="flex h-full min-h-0 w-full flex-col overflow-hidden"
				onClick={focusInput}
			>
				<header className="shrink-0 border-b border-[var(--term-border)] bg-[var(--term-panel-alt)] px-4 py-3 sm:px-5">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="truncate text-sm text-[var(--term-text)]">
								{getPrompt(shellState.cwd)}
							</p>
						</div>

						<button
							type="button"
							onClick={cycleTheme}
							className="shrink-0 rounded-md border border-[var(--term-border)] bg-[var(--term-panel)] px-3 py-1.5 text-xs text-[var(--term-text)] transition hover:border-[var(--term-accent)] hover:text-[var(--term-accent)]"
						>
							Theme: {currentTheme.name}
						</button>
					</div>

					<p className="mt-2 text-xs text-[var(--term-muted)]">
						Tab completes commands and paths. Press Tab twice to list matches. Up
						and Down walk history. Ctrl+L clears the screen.
					</p>

					<div className="-mx-1 mt-3 overflow-x-auto pb-1">
						<div className="flex w-max gap-2 px-1">
							{EXAMPLE_COMMANDS.map((command) => (
								<button
									key={command}
									type="button"
									onClick={() => runCommand(command)}
									className="rounded-full border border-[var(--term-border)] bg-[var(--term-panel)] px-3 py-1 text-xs text-[var(--term-muted)] transition hover:border-[var(--term-accent)] hover:text-[var(--term-text)]"
								>
									{command}
								</button>
							))}
						</div>
					</div>
				</header>

				<div
					ref={scrollViewportRef}
					className="min-h-0 flex-1 overflow-y-auto bg-[var(--term-panel)] px-4 py-3 sm:px-5"
				>
					<div className="space-y-4 text-[14px] leading-5 sm:text-[15px]">
						{transcript.map((entry) => (
							<div key={entry.id} className="space-y-1.5">
								{entry.command ? (
									<div className="flex flex-wrap items-start gap-x-2 gap-y-1 leading-5">
										<span className="text-[var(--term-accent)]">{entry.prompt}</span>
										<span className="break-all text-[var(--term-text)]">{entry.command}</span>
									</div>
								) : null}
								{entry.output ? (
									<pre
										className={`whitespace-pre-wrap break-words leading-5 ${
											entry.isError
												? "text-[var(--term-error)]"
												: "text-[var(--term-text)]"
										}`}
									>
										{entry.output}
									</pre>
								) : null}
							</div>
						))}

						<form onSubmit={handleSubmit}>
							<label
								className={`flex items-start gap-2 border-t border-[var(--term-border)] pt-4 text-[14px] leading-5 sm:text-[15px] ${
									isInputFocused ? "text-[var(--term-text)]" : "text-[var(--term-muted)]"
								}`}
							>
								<span className="shrink-0 text-[var(--term-accent)]">
									{getPrompt(shellState.cwd)}
								</span>
								<span className="grid min-w-0 flex-1">
									<span
										aria-hidden="true"
										className="col-start-1 row-start-1 whitespace-pre-wrap break-all text-[var(--term-muted)]"
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
										onFocus={() => setIsInputFocused(true)}
										onBlur={() => setIsInputFocused(false)}
										className="col-start-1 row-start-1 w-full bg-transparent text-[var(--term-text)] outline-none placeholder:text-[var(--term-muted)]"
										autoComplete="off"
										autoCapitalize="off"
										autoCorrect="off"
										spellCheck={false}
										autoFocus
										placeholder='Try "help" or "ls -la"'
									/>
								</span>
							</label>
						</form>
					</div>
				</div>
			</section>
		</div>
	);
}
