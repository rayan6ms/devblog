export type FileNode = {
	type: "file";
	permissions: string;
	hidden: boolean;
	size: number;
	content: string;
};

export type DirectoryNode = {
	type: "directory";
	permissions: string;
	hidden: boolean;
	size: number;
	contents: Record<string, FileSystemNode>;
};

export type FileSystemNode = FileNode | DirectoryNode;

export type FileSystemTree = {
	root: DirectoryNode;
};

function file(
	content: string,
	permissions = "rw-",
	hidden = false,
): FileNode {
	return {
		type: "file",
		permissions,
		hidden,
		size: content.length,
		content,
	};
}

function directory(
	contents: Record<string, FileSystemNode>,
	permissions = "rw-",
	hidden = false,
): DirectoryNode {
	return {
		type: "directory",
		permissions,
		hidden,
		size: 1,
		contents,
	};
}

const initialFileSystem: FileSystemTree = {
	root: directory(
		{
			bin: directory(
				{
					ls: file("ls command", "r--"),
					cd: file("cd command", "r--"),
					pwd: file("pwd command", "r--"),
					mkdir: file("mkdir command", "r--"),
					rm: file("rm command", "r--"),
					rmdir: file("rmdir command", "r--"),
					cat: file("cat command", "r--"),
					touch: file("touch command", "r--"),
					mv: file("mv command", "r--"),
					cp: file("cp command", "r--"),
					date: file("date command", "r--"),
					whoami: file("whoami command", "r--"),
					hostname: file("hostname command", "r--"),
					history: file("history command", "r--"),
					find: file("find command", "r--"),
					tree: file("tree command", "r--"),
					echo: file("echo command", "r--"),
					clear: file("clear command", "r--"),
					help: file("help command", "r--"),
				},
				"r--",
			),
			boot: directory(
				{
					"boot.log": file(
						"[    0.000000] Linux version 6.8.0-demo\n[    0.417000] Mounted playground filesystem\n[    1.001000] Terminal playground ready",
						"r--",
					),
				},
				"r--",
			),
			dev: directory(
				{
					null: file("", "rw-"),
					tty1: file("active terminal session", "rw-"),
				},
				"r--",
			),
			etc: directory(
				{
					config: file("theme=interactive\nshell=devblog\nmotd=true", "r--"),
					hosts: file("127.0.0.1 localhost\n127.0.1.1 devblog", "r--"),
					motd: file(
						"Welcome to the playground shell.\nNothing here is real, but all of it is explorable.",
						"r--",
					),
					profile: file("export EDITOR=vim\nexport PAGER=cat", "r--"),
					network: directory(
						{
							interfaces: file("lo\neth0", "r--"),
							"resolv.conf": file("nameserver 1.1.1.1", "r--"),
						},
						"r--",
					),
				},
				"r--",
			),
			home: directory(
				{
					rayan: directory({
						Desktop: directory({
							"ideas.txt": file(
								"- add a fake deploy pipeline\n- turn `tree` into a mini map\n- hide an easter egg in Pictures/",
							),
							"ascii-castle.txt": file(
								"      |>>>                    |>>>\n      |                        |\n  _  _|_  _                _  _|_  _\n |;|_|;|_|;|              |;|_|;|_|;|",
							),
						}),
						Documents: directory({
							file1: file("Hello, world!"),
							file2: file("This is another file."),
							notes: directory({
								"today.txt": file(
									"Today:\n- test path completion\n- reorganize the fake workstation\n- remember to feed the demo dragon",
								),
								"terminal-ideas.md": file(
									"# Terminal ideas\n\n- add path completion\n- add more files\n- ship a Dracula theme",
								),
							}),
							projects: directory({
								"launch-plan.md": file(
									"# Launch Plan\n\n1. Polish shell UX\n2. Seed believable files\n3. Pretend this was always the roadmap",
								),
								"terminal-redesign.txt": file(
									"Reduce chrome.\nKeep the examples visible.\nMake Tab feel real.",
								),
							}),
							recipes: directory({
								"coffee.txt": file(
									"1. Grind beans\n2. Bloom for 30s\n3. Pour slowly\n4. Pretend you are debugging in a cafe",
								),
								"pao-de-queijo.txt": file(
									"Ingredients:\n- tapioca flour\n- eggs\n- milk\n- cheese\nBake until golden.",
								),
							}),
						}),
						Downloads: directory({
							"terminal-theme-pack.zip": file("binary data omitted"),
							"release-notes.txt": file(
								"v0.3.0\n- better shell layout\n- stronger path completion\n- more nonsense files",
							),
							"dracula-wallpaper.png": file("PNG placeholder bytes"),
						}),
						Games: directory({
							"highscores.txt": file("snake  240\npong   190\ntetris 410"),
							saves: directory({
								"space-odyssey.sav": file("pilot=rayan\nsector=07\ncredits=1420"),
								"tank-shooter.sav": file("wave=12\nupgrades=armor,range"),
							}),
						}),
						Music: directory({
							"playlist.m3u": file(
								"#EXTM3U\n/home/rayan/Music/synthwave/night-drive.ogg\n/home/rayan/Music/synthwave/rain-grid.ogg",
							),
							synthwave: directory({
								"night-drive.ogg": file("audio placeholder"),
								"rain-grid.ogg": file("audio placeholder"),
								"tracklist.txt": file("01 Night Drive\n02 Rain Grid\n03 Neon Checkout"),
							}),
						}),
						Pictures: directory({
							"polaroid-01.txt": file("A blurry photo of a monitor full of green text."),
							landscapes: directory({
								"glacier-note.txt": file("Probably not a glacier. Still a decent wallpaper."),
								"oxide-sunset.txt": file("Orange horizon, low clouds, suspiciously cinematic."),
							}),
						}),
						Public: directory({
							"readme.txt": file("Public drop zone. Leave something interesting behind."),
							"links.html": file("<ul><li>shell tips</li><li>theme references</li></ul>"),
						}),
						Templates: directory({
							"journal.md": file("# Journal\n\nMood:\nFocus:\nShip:"),
							"shell-script.sh": file("#!/usr/bin/env bash\necho demo"),
						}),
						Videos: directory({
							"render-queue.txt": file("intro-cut.mov\nshell-tour.mp4\nbinary-pong-teaser.webm"),
							clips: directory({
								"demo-reel.txt": file("Scene list:\n- terminal zoom\n- neon prompt\n- fake deployment"),
							}),
						}),
						Workspace: directory({
							client: directory({
								"brief.txt": file(
									"The client asked for a Linux terminal. Then they were right about the gradients.",
								),
								mockups: directory({
									"v1.txt": file("too glossy"),
									"v2.txt": file("getting closer"),
									"v3.txt": file("ship it"),
								}),
							}),
							research: directory({
								"color-notes.md": file(
									"Dracula is mandatory.\nSubtle backgrounds beat fancy gradients.",
								),
							}),
						}),
						".bashrc": file(
							"export PATH=$PATH:/usr/local/bin\nalias ll='ls -la'\nalias cls='clear'",
							"rw-",
							true,
						),
						".profile": file("# User specific environment\nexport TERMINAL_THEME=green", "rw-", true),
						".vimrc": file("syntax on\nset number", "rw-", true),
						".gitconfig": file("[user]\n\tname = Rayan\n\temail = rayan@example.dev", "rw-", true),
						".ssh": directory(
							{
								config: file("Host playground\n  HostName 127.0.0.1\n  User rayan", "rw-", true),
								known_hosts: file("localhost ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA", "rw-", true),
							},
							"rw-",
							true,
						),
						".cache": directory(
							{
								"motd-cache.txt": file("Last boot message cached here.", "rw-", true),
							},
							"rw-",
							true,
						),
					}),
				},
				"rw-",
			),
			lib: directory(
				{
					modules: directory(
						{
							"demo-kernel.txt": file("Pretend kernel modules live here.", "r--"),
						},
						"r--",
					),
				},
				"r--",
			),
			sbin: directory(
				{
					fsck: file("system binary placeholder", "r--"),
				},
				"r--",
			),
			usr: directory(
				{
					share: directory(
						{
							doc: directory(
								{
									"terminal-demo.txt": file(
										"This fake filesystem exists to make the terminal more fun to poke at.",
										"r--",
									),
								},
								"r--",
							),
						},
						"r--",
					),
				},
				"r--",
			),
			var: directory(
				{
					log: directory(
						{
							"system.log": file(
								"[info] shell booted\n[info] transcript initialized\n[warn] user keeps asking for more realism",
							),
							"deploy.log": file(
								"build 18: success\nbuild 19: success\nbuild 20: success",
							),
						},
					),
					tmp: directory({}),
				},
				"rw-",
			),
		},
		"r--",
	),
};

export default initialFileSystem;
