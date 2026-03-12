import initialFileSystem, { type FileSystemNode, type FileSystemTree } from "./fileSystem";
import {
	checkPermissions,
	cloneValue,
	findSimilarCommand,
	formatFileSize,
	getNodeAtPath,
	getNodeSize,
	getParentDirectory,
	isDirectory,
	isFile,
	parseFlags,
	resolvePath,
	splitPath,
	tokenizeInput,
} from "./utils";

const HOME_DIRECTORY = "/home/rayan";
const USERNAME = "rayan";
const HOSTNAME = "devblog";

export const welcomeMessage = String.raw`             
 ____             ____  _             
|  _ \  _____   _| __ )| | ___   __ _ 
| | | |/ _ \ \ / /  _ \| |/ _ \ / _  |
| |_| |  __/\ V /| |_) | | (_) | (_| |
|____/ \___| \_/ |____/|_|\___/ \__, |
                                |___/ 

Type "help" to list commands.
Try "tree", "ls Documents", "cat Workspace/client/brief.txt", or "find . v3.txt".
Tab completes commands and paths. Press Tab twice to list matches. ArrowUp and ArrowDown walk command history. Ctrl+L clears.`;

export const commandDescriptions = {
	help: "Show the list of supported commands",
	clear: "Clear the current terminal session",
	echo: "Print text to the terminal",
	ls: "List files in the current directory",
	cd: "Change the current working directory",
	pwd: "Print the current working directory",
	mkdir: "Create a new directory",
	rm: "Remove a file",
	rmdir: "Remove an empty directory",
	cat: "Print file contents",
	touch: "Create a new file",
	mv: "Move or rename a file or directory",
	cp: "Copy a file or directory",
	date: "Print the current date and time",
	whoami: "Print the current user",
	hostname: "Print the terminal host name",
	history: "Show previous commands",
	find: "Find files or directories by name",
	tree: "Print the directory tree",
} as const;

type CommandName = keyof typeof commandDescriptions;

type CommandContext = {
	state: ShellState;
	stdin: string;
};

type CommandResult = {
	output: string;
	error?: boolean;
	clear?: boolean;
};

type CommandHandler = (args: string[], context: CommandContext) => CommandResult;

type ConditionalSegment = {
	connector: "always" | "and" | "or";
	tokens: string[];
};

type Redirect = {
	path: string;
	append: boolean;
};

type ParsedSegment = {
	pipeline: string[][];
	inputPath?: string;
	outputRedirect?: Redirect;
};

export type ShellState = {
	cwd: string;
	fileSystem: FileSystemTree;
	commandHistory: string[];
};

function getDisplayPath(cwd: string) {
	return cwd === HOME_DIRECTORY
		? "~"
		: cwd.startsWith(`${HOME_DIRECTORY}/`)
			? cwd.replace(HOME_DIRECTORY, "~")
			: cwd;
}

export function getPrompt(cwd: string) {
	return `${USERNAME}@${HOSTNAME}:${getDisplayPath(cwd)}$`;
}

export function cloneShellState(state: ShellState) {
	return cloneValue(state);
}

export function createShellState(): ShellState {
	return {
		cwd: HOME_DIRECTORY,
		fileSystem: cloneValue(initialFileSystem),
		commandHistory: [],
	};
}

export function getCommandNames() {
	return Object.keys(commandDescriptions);
}

function createError(output: string): CommandResult {
	return { output, error: true };
}

function writeFile(
	state: ShellState,
	targetPath: string,
	content: string,
	append = false,
): CommandResult | null {
	const resolvedPath = resolvePath(state.cwd, targetPath);
	const parentInfo = getParentDirectory(state.fileSystem, resolvedPath);

	if (!parentInfo) {
		return createError(`redirection: cannot write to '${targetPath}': No such file or directory`);
	}

	if (!checkPermissions(parentInfo.parent, "w")) {
		return createError(`redirection: cannot write to '${targetPath}': Permission denied`);
	}

	const existingNode = parentInfo.parent.contents[parentInfo.name];
	if (existingNode && existingNode.type === "directory") {
		return createError(`redirection: cannot write to '${targetPath}': Is a directory`);
	}

	const nextContent =
		append && isFile(existingNode) ? `${existingNode.content}${content}` : content;

	parentInfo.parent.contents[parentInfo.name] = {
		type: "file",
		permissions: existingNode?.permissions ?? "rw-",
		hidden: parentInfo.name.startsWith("."),
		size: nextContent.length,
		content: nextContent,
	};

	return null;
}

function readFile(state: ShellState, targetPath: string) {
	const resolvedPath = resolvePath(state.cwd, targetPath);
	const node = getNodeAtPath(state.fileSystem, resolvedPath);

	if (!isFile(node)) {
		return createError(`${targetPath}: No such file`);
	}

	return { output: node.content };
}

const commandHandlers: Record<CommandName, CommandHandler> = {
	help: () => {
		const lines = Object.entries(commandDescriptions).map(([name, description]) => {
			return `${name.padEnd(10, " ")} ${description}`;
		});
		return { output: lines.join("\n") };
	},
	clear: () => ({ output: "", clear: true }),
	echo: (args, context) => ({
		output: args.length > 0 ? args.join(" ") : context.stdin,
	}),
	ls: (args, context) => {
		const { options, values } = parseFlags(args);
		const targetPath = resolvePath(context.state.cwd, values[0] ?? ".");
		const node = getNodeAtPath(context.state.fileSystem, targetPath);

		if (!node) {
			return createError(`ls: cannot access '${values[0] ?? "."}': No such file or directory`);
		}

		const entries = isDirectory(node)
			? Object.entries(node.contents)
			: [[splitPath(targetPath).at(-1) ?? targetPath, node] as const];

		const visibleEntries = entries
			.filter(([, child]) => options.has("a") || !child.hidden)
			.sort(([left], [right]) => left.localeCompare(right));

		if (options.has("l")) {
			return {
				output: visibleEntries
					.map(([name, child]) => {
						const size = options.has("h")
							? formatFileSize(getNodeSize(child))
							: String(getNodeSize(child));
						const type = child.type === "directory" ? "d" : "-";
						return `${child.permissions} ${type} ${size.padStart(8, " ")} ${name}`;
					})
					.join("\n"),
			};
		}

		if (options.has("h")) {
			return {
				output: visibleEntries
					.map(([name, child]) => `${name} (${formatFileSize(getNodeSize(child))})`)
					.join("  "),
			};
		}

		return { output: visibleEntries.map(([name]) => name).join("  ") };
	},
	cd: (args, context) => {
		const destination = resolvePath(context.state.cwd, args[0] ?? HOME_DIRECTORY);
		const node = getNodeAtPath(context.state.fileSystem, destination);

		if (!isDirectory(node)) {
			return createError(`cd: ${args[0] ?? HOME_DIRECTORY}: No such directory`);
		}

		context.state.cwd = destination;
		return { output: "" };
	},
	pwd: (_args, context) => ({ output: context.state.cwd }),
	mkdir: (args, context) => {
		const target = args[0];

		if (!target) {
			return createError("mkdir: missing operand");
		}

		const resolvedPath = resolvePath(context.state.cwd, target);
		const parentInfo = getParentDirectory(context.state.fileSystem, resolvedPath);

		if (!parentInfo) {
			return createError(`mkdir: cannot create directory '${target}': No such file or directory`);
		}

		if (!checkPermissions(parentInfo.parent, "w")) {
			return createError(`mkdir: cannot create directory '${target}': Permission denied`);
		}

		if (parentInfo.parent.contents[parentInfo.name]) {
			return createError(`mkdir: cannot create directory '${target}': File exists`);
		}

		parentInfo.parent.contents[parentInfo.name] = {
			type: "directory",
			permissions: "rw-",
			hidden: parentInfo.name.startsWith("."),
			size: 0,
			contents: {},
		};

		return { output: "" };
	},
	rm: (args, context) => {
		const target = args[0];

		if (!target) {
			return createError("rm: missing operand");
		}

		const resolvedPath = resolvePath(context.state.cwd, target);
		const parentInfo = getParentDirectory(context.state.fileSystem, resolvedPath);

		if (!parentInfo) {
			return createError(`rm: cannot remove '${target}': No such file`);
		}

		if (!checkPermissions(parentInfo.parent, "w")) {
			return createError(`rm: cannot remove '${target}': Permission denied`);
		}

		const node = parentInfo.parent.contents[parentInfo.name];
		if (!node || node.type === "directory") {
			return createError(`rm: cannot remove '${target}': No such file`);
		}

		delete parentInfo.parent.contents[parentInfo.name];
		return { output: "" };
	},
	rmdir: (args, context) => {
		const target = args[0];

		if (!target) {
			return createError("rmdir: missing operand");
		}

		const resolvedPath = resolvePath(context.state.cwd, target);
		const parentInfo = getParentDirectory(context.state.fileSystem, resolvedPath);

		if (!parentInfo) {
			return createError(`rmdir: failed to remove '${target}': No such directory`);
		}

		if (!checkPermissions(parentInfo.parent, "w")) {
			return createError(`rmdir: failed to remove '${target}': Permission denied`);
		}

		const node = parentInfo.parent.contents[parentInfo.name];
		if (!node || node.type !== "directory") {
			return createError(`rmdir: failed to remove '${target}': No such directory`);
		}

		if (Object.keys(node.contents).length > 0) {
			return createError(`rmdir: failed to remove '${target}': Directory not empty`);
		}

		delete parentInfo.parent.contents[parentInfo.name];
		return { output: "" };
	},
	cat: (args, context) => {
		const { options, values } = parseFlags(args);

		if (values.length === 0) {
			return { output: context.stdin };
		}

		const output = values
			.map((target) => {
				const node = getNodeAtPath(
					context.state.fileSystem,
					resolvePath(context.state.cwd, target),
				);

				if (!isFile(node)) {
					return `cat: ${target}: No such file`;
				}

				if (!options.has("n")) {
					return node.content;
				}

				return node.content
					.split("\n")
					.map((line, index) => `${String(index + 1).padStart(3, " ")}  ${line}`)
					.join("\n");
			})
			.join("\n");

		return { output, error: output.includes("No such file") };
	},
	touch: (args, context) => {
		const target = args[0];

		if (!target) {
			return createError("touch: missing file operand");
		}

		const resolvedPath = resolvePath(context.state.cwd, target);
		const parentInfo = getParentDirectory(context.state.fileSystem, resolvedPath);

		if (!parentInfo) {
			return createError(`touch: cannot touch '${target}': No such file or directory`);
		}

		if (!checkPermissions(parentInfo.parent, "w")) {
			return createError(`touch: cannot touch '${target}': Permission denied`);
		}

		if (!parentInfo.parent.contents[parentInfo.name]) {
			parentInfo.parent.contents[parentInfo.name] = {
				type: "file",
				permissions: "rw-",
				hidden: parentInfo.name.startsWith("."),
				size: 0,
				content: "",
			};
		}

		return { output: "" };
	},
	mv: (args, context) => {
		const [sourcePath, destinationPath] = args;

		if (!sourcePath || !destinationPath) {
			return createError("mv: missing file operand");
		}

		const sourceResolved = resolvePath(context.state.cwd, sourcePath);
		const sourceParentInfo = getParentDirectory(context.state.fileSystem, sourceResolved);

		if (!sourceParentInfo) {
			return createError(`mv: cannot stat '${sourcePath}': No such file or directory`);
		}

		if (!checkPermissions(sourceParentInfo.parent, "w")) {
			return createError(`mv: cannot move '${sourcePath}': Permission denied`);
		}

		const sourceNode = sourceParentInfo.parent.contents[sourceParentInfo.name];
		if (!sourceNode) {
			return createError(`mv: cannot stat '${sourcePath}': No such file or directory`);
		}

		const destinationResolved = resolvePath(context.state.cwd, destinationPath);
		const destinationParentInfo = getParentDirectory(
			context.state.fileSystem,
			destinationResolved,
		);

		if (!destinationParentInfo) {
			return createError(`mv: cannot move '${sourcePath}' to '${destinationPath}': No such file or directory`);
		}

		if (!checkPermissions(destinationParentInfo.parent, "w")) {
			return createError(`mv: cannot move '${sourcePath}' to '${destinationPath}': Permission denied`);
		}

		if (destinationParentInfo.parent.contents[destinationParentInfo.name]) {
			return createError(`mv: cannot move '${sourcePath}' to '${destinationPath}': File exists`);
		}

		destinationParentInfo.parent.contents[destinationParentInfo.name] = sourceNode;
		delete sourceParentInfo.parent.contents[sourceParentInfo.name];
		return { output: "" };
	},
	cp: (args, context) => {
		const [sourcePath, destinationPath] = args;

		if (!sourcePath || !destinationPath) {
			return createError("cp: missing file operand");
		}

		const sourceResolved = resolvePath(context.state.cwd, sourcePath);
		const sourceNode = getNodeAtPath(context.state.fileSystem, sourceResolved);

		if (!sourceNode) {
			return createError(`cp: cannot stat '${sourcePath}': No such file or directory`);
		}

		const destinationResolved = resolvePath(context.state.cwd, destinationPath);
		const destinationParentInfo = getParentDirectory(
			context.state.fileSystem,
			destinationResolved,
		);

		if (!destinationParentInfo) {
			return createError(`cp: cannot copy '${sourcePath}' to '${destinationPath}': No such file or directory`);
		}

		if (!checkPermissions(destinationParentInfo.parent, "w")) {
			return createError(`cp: cannot copy '${sourcePath}' to '${destinationPath}': Permission denied`);
		}

		if (destinationParentInfo.parent.contents[destinationParentInfo.name]) {
			return createError(`cp: cannot copy '${sourcePath}' to '${destinationPath}': File exists`);
		}

		destinationParentInfo.parent.contents[destinationParentInfo.name] = cloneValue(sourceNode);
		return { output: "" };
	},
	date: () => ({ output: new Date().toString() }),
	whoami: () => ({ output: USERNAME }),
	hostname: () => ({ output: HOSTNAME }),
	history: (_args, context) => ({
		output: context.state.commandHistory
			.map((command, index) => `${index + 1}  ${command}`)
			.join("\n"),
	}),
	find: (args, context) => {
		const { options, values } = parseFlags(args);
		const startArg = values.length > 1 ? values[0] : ".";
		const searchName = values.length > 1 ? values[1] : values[0];

		if (!searchName) {
			return createError("find: missing search term");
		}

		const startPath = resolvePath(context.state.cwd, startArg);
		const startNode = getNodeAtPath(context.state.fileSystem, startPath);

		if (!startNode) {
			return createError(`find: '${startArg}': No such file or directory`);
		}

		const expectedName = options.has("i") ? searchName.toLowerCase() : searchName;
		const matches: string[] = [];

		const walk = (node: FileSystemNode, path: string) => {
			const label = splitPath(path).at(-1) ?? "/";
			const comparableLabel = options.has("i") ? label.toLowerCase() : label;

			if (comparableLabel === expectedName) {
				matches.push(path);
			}

			if (!isDirectory(node)) {
				return;
			}

			for (const [name, child] of Object.entries(node.contents)) {
				const childPath = path === "/" ? `/${name}` : `${path}/${name}`;
				walk(child, childPath);
			}
		};

		walk(startNode, startPath);

		return { output: matches.join("\n") };
	},
	tree: (args, context) => {
		const { options, values } = parseFlags(args);
		const targetArg = values[0] ?? ".";
		const targetPath = resolvePath(context.state.cwd, targetArg);
		const targetNode = getNodeAtPath(context.state.fileSystem, targetPath);

		if (!targetNode) {
			return createError(`tree: '${targetArg}': No such file or directory`);
		}

		const showHidden = options.has("a");
		const labelFor = (name: string, node: FileSystemNode) =>
			node.type === "directory" ? `${name}/` : name;

		if (!isDirectory(targetNode)) {
			return {
				output: labelFor(splitPath(targetPath).at(-1) ?? targetArg, targetNode),
			};
		}

		const rootLabel =
			targetArg === "."
				? "."
				: labelFor(splitPath(targetPath).at(-1) ?? "/", targetNode);
		const lines = [rootLabel];

		const walk = (node: FileSystemNode, prefix: string) => {
			if (!isDirectory(node)) {
				return;
			}

			const entries = Object.entries(node.contents)
				.filter(([, child]) => showHidden || !child.hidden)
				.sort(([left], [right]) => left.localeCompare(right));

			entries.forEach(([name, child], index) => {
				const isLast = index === entries.length - 1;
				const branch = isLast ? "`-- " : "|-- ";
				lines.push(`${prefix}${branch}${labelFor(name, child)}`);
				walk(child, `${prefix}${isLast ? "    " : "|   "}`);
			});
		};

		walk(targetNode, "");
		return { output: lines.join("\n") };
	},
};

function parseConditionalSegments(tokens: string[]) {
	const segments: ConditionalSegment[] = [];
	let connector: ConditionalSegment["connector"] = "always";
	let buffer: string[] = [];

	for (const token of tokens) {
		if (token === "&&" || token === "||") {
			if (buffer.length > 0) {
				segments.push({ connector, tokens: buffer });
			}
			buffer = [];
			connector = token === "&&" ? "and" : "or";
			continue;
		}

		buffer.push(token);
	}

	if (buffer.length > 0) {
		segments.push({ connector, tokens: buffer });
	}

	return segments;
}

function parseSegment(tokens: string[]): ParsedSegment | CommandResult {
	const pipeline: string[][] = [[]];
	let inputPath = "";
	let outputRedirect: Redirect | undefined;

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];

		if (token === "|") {
			if (pipeline[pipeline.length - 1].length === 0) {
				return createError("syntax error near unexpected token '|'");
			}
			pipeline.push([]);
			continue;
		}

		if (token === "<") {
			const nextToken = tokens[index + 1];
			if (!nextToken) {
				return createError("syntax error near unexpected token '<'");
			}
			inputPath = nextToken;
			index += 1;
			continue;
		}

		if (token === ">" || token === ">>") {
			const nextToken = tokens[index + 1];
			if (!nextToken) {
				return createError(`syntax error near unexpected token '${token}'`);
			}
			outputRedirect = { path: nextToken, append: token === ">>" };
			index += 1;
			continue;
		}

		pipeline[pipeline.length - 1].push(token);
	}

	if (pipeline.some((stage) => stage.length === 0)) {
		return createError("syntax error near unexpected token");
	}

	return {
		pipeline,
		inputPath: inputPath || undefined,
		outputRedirect,
	};
}

function executePipeline(segment: ParsedSegment, state: ShellState): CommandResult {
	let stdin = "";

	if (segment.inputPath) {
		const inputResult = readFile(state, segment.inputPath);
		if (inputResult.error) {
			return inputResult;
		}
		stdin = inputResult.output;
	}

	let latestResult: CommandResult = { output: "" };

	for (const stage of segment.pipeline) {
		const [commandName, ...args] = stage;
		const handler = commandHandlers[commandName as CommandName];

		if (!handler) {
			const suggestion = findSimilarCommand(commandName, getCommandNames());
			return createError(
				suggestion
					? `Command not found: ${commandName}. Did you mean "${suggestion}"?`
					: `Command not found: ${commandName}. Type "help" for a list of commands.`,
			);
		}

		latestResult = handler(args, { state, stdin });
		if (latestResult.error || latestResult.clear) {
			return latestResult;
		}

		stdin = latestResult.output;
	}

	if (segment.outputRedirect) {
		const redirectionResult = writeFile(
			state,
			segment.outputRedirect.path,
			latestResult.output,
			segment.outputRedirect.append,
		);

		if (redirectionResult) {
			return redirectionResult;
		}

		return { output: "" };
	}

	return latestResult;
}

export function executeLine(input: string, state: ShellState): CommandResult {
	const trimmedInput = input.trim();

	if (!trimmedInput) {
		return { output: "" };
	}

	state.commandHistory.push(trimmedInput);
	const tokens = tokenizeInput(trimmedInput);
	const segments = parseConditionalSegments(tokens);
	const outputs: string[] = [];
	let previousSucceeded = true;
	let latestResult: CommandResult = { output: "" };

	for (const segment of segments) {
		const shouldRun =
			segment.connector === "always" ||
			(segment.connector === "and" && previousSucceeded) ||
			(segment.connector === "or" && !previousSucceeded);

		if (!shouldRun) {
			continue;
		}

		const parsedSegment = parseSegment(segment.tokens);
		if (!("pipeline" in parsedSegment)) {
			return parsedSegment;
		}

		latestResult = executePipeline(parsedSegment, state);
		previousSucceeded = !latestResult.error;

		if (latestResult.clear) {
			return latestResult;
		}

		if (latestResult.output) {
			outputs.push(latestResult.output);
		}
	}

	return {
		output: outputs.join("\n"),
		error: latestResult.error,
	};
}
