import type {
	DirectoryNode,
	FileNode,
	FileSystemNode,
	FileSystemTree,
} from "./fileSystem";

export function cloneValue<T>(value: T): T {
	return structuredClone(value);
}

export function isDirectory(
	node: FileSystemNode | null | undefined,
): node is DirectoryNode {
	return Boolean(node && node.type === "directory");
}

export function isFile(node: FileSystemNode | null | undefined): node is FileNode {
	return Boolean(node && node.type === "file");
}

export function splitPath(path: string) {
	return path.split("/").filter(Boolean);
}

export function resolvePath(currentPath: string, targetPath?: string) {
	if (!targetPath || targetPath === ".") {
		return currentPath;
	}

	const source = targetPath.startsWith("/") ? [] : splitPath(currentPath);

	for (const part of splitPath(targetPath)) {
		if (part === ".") {
			continue;
		}

		if (part === "..") {
			source.pop();
			continue;
		}

		source.push(part);
	}

	return `/${source.join("/")}` || "/";
}

export function getNodeAtPath(fileSystem: FileSystemTree, path: string) {
	if (path === "/") {
		return fileSystem.root;
	}

	let current: FileSystemNode = fileSystem.root;

	for (const part of splitPath(path)) {
		if (!isDirectory(current)) {
			return null;
		}

		const next: FileSystemNode | undefined = current.contents[part];
		if (!next) {
			return null;
		}

		current = next;
	}

	return current;
}

export function getParentDirectory(fileSystem: FileSystemTree, path: string) {
	const segments = splitPath(path);
	const name = segments.pop();

	if (!name) {
		return null;
	}

	const parentPath = segments.length ? `/${segments.join("/")}` : "/";
	const parent = getNodeAtPath(fileSystem, parentPath);

	if (!isDirectory(parent)) {
		return null;
	}

	return { parent, name, parentPath };
}

export function checkPermissions(
	node: FileSystemNode | null | undefined,
	permission: string,
) {
	return Boolean(node && node.permissions.includes(permission));
}

export function getNodeSize(node: FileSystemNode): number {
	if (node.type === "file") {
		return node.content.length;
	}

	return Object.values(node.contents).reduce((total, child) => {
		return total + getNodeSize(child);
	}, 0);
}

export function formatFileSize(size: number) {
	if (size >= 1_000_000_000) {
		return `${(size / 1_000_000_000).toFixed(2)} GB`;
	}

	if (size >= 1_000_000) {
		return `${(size / 1_000_000).toFixed(2)} MB`;
	}

	if (size >= 1_000) {
		return `${(size / 1_000).toFixed(2)} KB`;
	}

	return `${size} B`;
}

export function parseFlags(argv: string[]) {
	const options = new Set<string>();
	const values: string[] = [];

	for (const arg of argv) {
		if (arg.startsWith("--")) {
			options.add(arg.slice(2));
			continue;
		}

		if (arg.startsWith("-") && arg.length > 1) {
			for (const option of arg.slice(1)) {
				options.add(option);
			}
			continue;
		}

		values.push(arg);
	}

	return { options, values };
}

export function tokenizeInput(input: string) {
	const tokens: string[] = [];
	let current = "";
	let quote: '"' | "'" | null = null;

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const next = input[index + 1];

		if (quote) {
			if (char === "\\") {
				current += next ?? "";
				index += 1;
				continue;
			}

			if (char === quote) {
				quote = null;
				continue;
			}

			current += char;
			continue;
		}

		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}

		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}

		if ((char === "&" && next === "&") || (char === "|" && next === "|")) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			tokens.push(`${char}${next}`);
			index += 1;
			continue;
		}

		if (char === ">" && next === ">") {
			if (current) {
				tokens.push(current);
				current = "";
			}
			tokens.push(">>");
			index += 1;
			continue;
		}

		if (char === "|" || char === ">" || char === "<") {
			if (current) {
				tokens.push(current);
				current = "";
			}
			tokens.push(char);
			continue;
		}

		if (char === "\\") {
			current += next ?? "";
			index += 1;
			continue;
		}

		current += char;
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
}

function levenshtein(left: string, right: string) {
	const matrix = Array.from({ length: left.length + 1 }, (_, row) =>
		Array.from({ length: right.length + 1 }, (_, column) => {
			if (row === 0) {
				return column;
			}

			if (column === 0) {
				return row;
			}

			return 0;
		}),
	);

	for (let row = 1; row <= left.length; row += 1) {
		for (let column = 1; column <= right.length; column += 1) {
			const cost = left[row - 1] === right[column - 1] ? 0 : 1;
			matrix[row][column] = Math.min(
				matrix[row - 1][column] + 1,
				matrix[row][column - 1] + 1,
				matrix[row - 1][column - 1] + cost,
			);
		}
	}

	return matrix[left.length][right.length];
}

export function findSimilarCommand(command: string, commands: string[]) {
	let match = "";
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of commands) {
		const distance = levenshtein(command, candidate);
		if (distance > 0 && distance < bestDistance) {
			bestDistance = distance;
			match = candidate;
		}
	}

	return bestDistance <= 3 ? match : "";
}
