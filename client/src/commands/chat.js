const blessed = require("blessed");
const WebSocket = require("ws");
const chalkModule = require("chalk");
const chalk =
	chalkModule && chalkModule.default ? chalkModule.default : chalkModule;
const config = require("../config/store");

function formatTime(date = new Date()) {
	return date
		.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		})
		.replace(/^0/, "");
}

function normalizeMessage(parsed) {
	if (!parsed || typeof parsed !== "object") {
		return {
			type: "message",
			username: "System",
			message: String(parsed || ""),
		};
	}

	return {
		type: parsed.type || "message",
		username: parsed.username || "System",
		message: parsed.message || "",
	};
}

function decodeTokenPayload(token) {
	try {
		const parts = String(token || "").split(".");
		if (parts.length < 2) {
			return null;
		}

		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
		return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
	} catch (error) {
		return null;
	}
}

function wrapText(text, width) {
	const safeWidth = Math.max(1, width || 1);
	const words = String(text || "")
		.split(/\s+/)
		.filter(Boolean);
	const lines = [];
	let currentLine = "";

	const pushCurrentLine = () => {
		if (currentLine) {
			lines.push(currentLine);
			currentLine = "";
		}
	};

	for (const word of words) {
		if (word.length > safeWidth) {
			pushCurrentLine();

			for (let index = 0; index < word.length; index += safeWidth) {
				lines.push(word.slice(index, index + safeWidth));
			}

			continue;
		}

		if (!currentLine) {
			currentLine = word;
			continue;
		}

		if (`${currentLine} ${word}`.length <= safeWidth) {
			currentLine = `${currentLine} ${word}`;
			continue;
		}

		pushCurrentLine();
		currentLine = word;
	}

	pushCurrentLine();

	if (!lines.length) {
		lines.push("");
	}

	return lines;
}

function stripTags(text) {
	return String(text || "").replace(/\{[^{}]+\}/g, "");
}

module.exports = async () => {
	const token = config.get("token");
	const tokenPayload = decodeTokenPayload(token);
	const currentUsername =
		tokenPayload && tokenPayload.username ? tokenPayload.username : null;
	const draftKey = currentUsername ? `draft:${currentUsername}` : "draft";

	if (!token) {
		console.log(
			chalk.red("No token found. Please run devtalk-cli login first."),
		);
		process.exit(0);
	}

	const screen = blessed.screen({
		smartCSR: true,
		title: "DevTalk-CLI",
		fullUnicode: true,
	});

	const header = blessed.box({
		top: 0,
		left: 0,
		width: "100%",
		height: 3,
		content:
			" {bold}DevTalk-CLI{/bold}  {gray-fg}Realtime terminal chat{/gray-fg}\n {gray-fg}Esc{/gray-fg} quit  {gray-fg}Enter{/gray-fg} send  {gray-fg}Ctrl+L{/gray-fg} clear",
		tags: true,
		border: {
			type: "line",
		},
		style: {
			border: {
				fg: "cyan",
			},
		},
	});

	const messages = blessed.log({
		top: 3,
		left: 0,
		width: "100%",
		height: "100%-8",
		border: {
			type: "line",
		},
		tags: true,
		keys: true,
		vi: true,
		mouse: true,
		scrollable: true,
		alwaysScroll: true,
		scrollback: 1000,
		pad: 1,
		style: {
			border: {
				fg: "blue",
			},
		},
	});

	const input = blessed.textbox({
		bottom: 3,
		left: 0,
		width: "100%",
		height: 5,
		border: {
			type: "line",
		},
		label: " Message ",
		inputOnFocus: true,
		tags: true,
		keys: true,
		mouse: true,
		style: {
			border: {
				fg: "green",
			},
			focus: {
				border: {
					fg: "yellow",
				},
			},
		},
	});

	const status = blessed.box({
		bottom: 0,
		left: 0,
		width: "100%",
		height: 3,
		content: " {yellow-fg}Connecting...{/yellow-fg}",
		tags: true,
		border: {
			type: "line",
		},
		style: {
			border: {
				fg: "magenta",
			},
		},
	});

	screen.append(header);
	screen.append(messages);
	screen.append(input);
	screen.append(status);

	const defaultHost = process.env.DEV_HOST || "devtalk-cli.onrender.com";
	const wsUrl = process.env.WS_URL || `wss://${defaultHost}?token=${token}`;

	let socket = null;
	let reconnectTimer = null;
	let draftSaveTimer = null;
	let reconnectAttempt = 0;
	let exiting = false;

	const clearReconnectTimer = () => {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	};

	const clearDraftTimer = () => {
		if (draftSaveTimer) {
			clearTimeout(draftSaveTimer);
			draftSaveTimer = null;
		}
	};

	const saveDraft = () => {
		const value = String(input.getValue() || "").trim();

		if (value) {
			config.set(draftKey, value);
			return;
		}

		config.set(draftKey, "");
	};

	const scheduleDraftSave = () => {
		clearDraftTimer();
		draftSaveTimer = setTimeout(() => {
			draftSaveTimer = null;
			saveDraft();
		}, 100);
	};

	const setStatus = (content, borderColor = "magenta") => {
		status.border.fg = borderColor;
		status.setContent(` ${content}`);
		screen.render();
	};

	const appendLine = (content) => {
		messages.log(content);
		screen.render();
	};

	const appendWrappedMessage = (prefix, message, prefixWidth, color = null) => {
		const availableWidth = Math.max(
			20,
			(messages.width || screen.width || 80) - 4 - prefixWidth,
		);
		const lines = wrapText(message, availableWidth);
		const indent = " ".repeat(prefixWidth);

		lines.forEach((line, index) => {
			const renderedLine =
				index === 0 ? `${prefix}${line}` : `${indent}${line}`;
			if (color) {
				messages.pushLine(`{${color}}${renderedLine}{/${color}}`);
				return;
			}

			messages.pushLine(renderedLine);
		});

		screen.render();
	};

	const focusInput = () => {
		input.focus();
		screen.program.showCursor(true);
		screen.render();
	};

	const connect = () => {
		clearReconnectTimer();
		setStatus(
			reconnectAttempt > 0
				? `{yellow-fg}Reconnecting{/yellow-fg} attempt ${reconnectAttempt}...`
				: "{yellow-fg}Connecting...{/yellow-fg}",
			reconnectAttempt > 0 ? "yellow" : "magenta",
		);

		const connection = new WebSocket(wsUrl);
		socket = connection;

		connection.on("open", () => {
			if (socket !== connection || exiting) {
				return;
			}

			const wasReconnecting = reconnectAttempt > 0;
			reconnectAttempt = 0;
			setStatus("{green-fg}Connected{/green-fg} to chat", "green");
			appendLine(
				`{green-fg}${formatTime()} ${wasReconnecting ? "Reconnected" : "Connected"} to server{/green-fg}`,
			);
		});

		connection.on("error", (err) => {
			if (socket !== connection || exiting) {
				return;
			}

			setStatus("{red-fg}Connection error{/red-fg}", "red");
			appendLine(
				`{red-fg}${formatTime()} WebSocket error: ${err.message || err}{/red-fg}`,
			);
		});

		connection.on("close", (code) => {
			if (socket !== connection || exiting) {
				return;
			}

			setStatus(`{yellow-fg}Disconnected{/yellow-fg} (code ${code})`, "yellow");
			appendLine(
				`{yellow-fg}${formatTime()} Disconnected (code=${code}){/yellow-fg}`,
			);
			appendLine("{yellow-fg}Reconnecting automatically...{/yellow-fg}");

			reconnectAttempt += 1;
			const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 10000);
			clearReconnectTimer();
			reconnectTimer = setTimeout(() => {
				if (!exiting) {
					connect();
				}
			}, delay);
		});

		connection.on("message", (data) => {
			if (socket !== connection || exiting) {
				return;
			}

			try {
				const parsed = normalizeMessage(JSON.parse(data));
				const timestamp = formatTime();

				if (parsed.type === "system") {
					appendLine(`{gray-fg}${timestamp} • ${parsed.message}{/gray-fg}`);
					return;
				}

				if (parsed.type === "error") {
					appendLine(`{red-fg}${timestamp} • ${parsed.message}{/red-fg}`);
					return;
				}

				if (currentUsername && parsed.username === currentUsername) {
					const prefix = `{gray-fg}${timestamp}{/gray-fg} {green-fg}You{/green-fg}: `;
					appendWrappedMessage(
						prefix,
						parsed.message,
						stripTags(prefix).length,
					);
					return;
				}

				const prefix = `{gray-fg}${timestamp}{/gray-fg} {cyan-fg}${parsed.username}{/cyan-fg}: `;
				appendWrappedMessage(prefix, parsed.message, stripTags(prefix).length);
			} catch (error) {
				appendLine(
					`{red-fg}${formatTime()} Failed to read message: ${error.message || error}{/red-fg}`,
				);
			}
		});
	};

	const cleanup = (exitCode = 0) => {
		if (exiting) {
			return;
		}

		exiting = true;
		clearReconnectTimer();
		clearDraftTimer();
		saveDraft();

		try {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.close(1000, "client_close");
			}
		} catch (error) {}

		try {
			screen.destroy();
		} catch (error) {}

		setTimeout(() => process.exit(exitCode), 150);
	};

	appendLine(
		"{center}{bold}{cyan-fg}Welcome to DevTalk-CLI{/cyan-fg}{/bold}{/center}",
	);
	appendLine("{center}{gray-fg}Waiting for connection...{/gray-fg}{/center}");
	input.setValue(config.get(draftKey) || "");
	screen.render();
	connect();

	screen.key(["escape", "q", "C-c"], () => cleanup(0));
	input.key(["C-c"], () => cleanup(0));

	screen.key(["C-l"], () => {
		messages.setContent("");
		appendLine("{center}{gray-fg}Chat history cleared{/gray-fg}{/center}");
		focusInput();
	});

	process.on("SIGINT", () => cleanup(0));

	input.on("submit", (value) => {
		const text = String(value || "").trim();

		if (!text) {
			input.clearValue();
			focusInput();
			return;
		}

		if (!socket || socket.readyState !== WebSocket.OPEN) {
			appendLine(`{red-fg}${formatTime()} Cannot send: not connected{/red-fg}`);
			focusInput();
			return;
		}

		try {
			socket.send(JSON.stringify({ message: text }));
			config.set(draftKey, "");
			setStatus("{green-fg}Message sent{/green-fg}", "green");
		} catch (error) {
			appendLine(
				`{red-fg}${formatTime()} Send failed: ${error.message || error}{/red-fg}`,
			);
			setStatus("{red-fg}Send failed{/red-fg}", "red");
		}

		input.clearValue();
		focusInput();
	});

	input.on("keypress", () => {
		scheduleDraftSave();
	});

	focusInput();
	setStatus(
		"{yellow-fg}Ready{/yellow-fg} - type a message and press Enter",
		"yellow",
	);
	screen.render();
};
