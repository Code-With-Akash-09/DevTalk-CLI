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
			" {bold}DevTalk-CLI{/bold}  {gray-fg}Realtime terminal chat{/gray-fg}\n {gray-fg}Esc{/gray-fg} quit  {gray-fg}Ctrl+S{/gray-fg} send  {gray-fg}Ctrl+L{/gray-fg} clear",
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
		bottom: 7,
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

	const INPUT_MIN_HEIGHT = 4;
	const INPUT_MAX_HEIGHT = 10;
	const COMPOSER_PLACEHOLDER =
		"Type a message. Press Enter to send.";
	let composerShowingPlaceholder = false;
	let presenceState = {
		onlineUsers: [],
		onlineCount: 0,
		typingUsers: [],
	};
	let connectionStatus = "{yellow-fg}Connecting...{/yellow-fg}";
	let typingTimer = null;
	let typingActive = false;

	const input = blessed.textarea({
		bottom: 3,
		left: 0,
		width: "100%",
		height: INPUT_MIN_HEIGHT,
		border: {
			type: "line",
		},
		label: " Message ",
		inputOnFocus: true,
		scrollable: true,
		alwaysScroll: true,
		tags: false,
		keys: true,
		vi: true,
		mouse: true,
		style: {
			fg: "white",
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
	let composerResizeTimer = null;
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

	const clearComposerResizeTimer = () => {
		if (composerResizeTimer) {
			clearTimeout(composerResizeTimer);
			composerResizeTimer = null;
		}
	};

	const clearTypingTimer = () => {
		if (typingTimer) {
			clearTimeout(typingTimer);
			typingTimer = null;
		}
	};

	const sanitizeName = (name) => stripTags(String(name || "")).trim();

	const getTypingUsers = () =>
		presenceState.typingUsers
			.map(sanitizeName)
			.filter(Boolean)
			.filter((name) => name !== currentUsername);

	const getPresenceSummary = () => {
		const onlineCount = presenceState.onlineCount || presenceState.onlineUsers.length;
		const typingUsers = getTypingUsers();
		const typingLabel = typingUsers.length
			? `{gray-fg}Typing:{/gray-fg} {yellow-fg}${typingUsers.join(", ")}{/yellow-fg}`
			: "{gray-fg}Typing:{/gray-fg} none";

		return `{gray-fg}Online:{/gray-fg} {green-fg}${onlineCount}{/green-fg}  ${typingLabel}`;
	};

	const renderStatus = () => {
		status.border.fg = status._borderColor || "magenta";
		status.setContent(` ${connectionStatus}\n ${getPresenceSummary()}`);
		screen.render();
	};

	const setStatus = (content, borderColor = "magenta") => {
		connectionStatus = content;
		status._borderColor = borderColor;
		renderStatus();
	};

	const updatePresenceState = (nextState) => {
		presenceState = {
			onlineUsers: Array.isArray(nextState.onlineUsers) ? nextState.onlineUsers : [],
			onlineCount:
				typeof nextState.onlineCount === "number"
					? nextState.onlineCount
					: Array.isArray(nextState.onlineUsers)
						? nextState.onlineUsers.length
						: 0,
			typingUsers: Array.isArray(nextState.typingUsers) ? nextState.typingUsers : [],
		};
		renderStatus();
	};

	const sendTypingState = (active) => {
		if (typingActive === active) {
			return;
		}

		typingActive = active;

		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}

		try {
			socket.send(JSON.stringify({ type: "typing", active }));
		} catch (error) {}
	};

	const markTyping = () => {
		if (composerShowingPlaceholder) {
			return;
		}

		sendTypingState(true);
		clearTypingTimer();
		typingTimer = setTimeout(() => {
			typingTimer = null;
			sendTypingState(false);
		}, 1200);
	};

	const stopTyping = () => {
		clearTypingTimer();
		sendTypingState(false);
	};

	const showComposerPlaceholder = () => {
		if (composerShowingPlaceholder) {
			return;
		}

		composerShowingPlaceholder = true;
		input.style.fg = "gray";
		input.setValue(COMPOSER_PLACEHOLDER);
	};

	const hideComposerPlaceholder = () => {
		if (!composerShowingPlaceholder) {
			return;
		}

		composerShowingPlaceholder = false;
		input.style.fg = "white";
		input.clearValue();
	};

	const getComposerValue = () =>
		composerShowingPlaceholder ? "" : String(input.getValue() || "").replace(/\r\n/g, "\n");

	const hasComposerText = () => Boolean(getComposerValue().trim());

	const updateComposerPlaceholder = () => {
		if (hasComposerText()) {
			hideComposerPlaceholder();
			return;
		}

		showComposerPlaceholder();
	};

	const measureComposerHeight = () => {
		const innerHeight =
			input._clines && input._clines.length ? input._clines.length : 1;
		const maxHeight = Math.max(
			INPUT_MIN_HEIGHT,
			Math.min(
				INPUT_MAX_HEIGHT,
				Math.max(INPUT_MIN_HEIGHT, (screen.height || 24) - 11),
			),
		);

		return Math.min(maxHeight, Math.max(INPUT_MIN_HEIGHT, innerHeight + 2));
	};

	const resizeComposer = () => {
		const nextHeight = measureComposerHeight();
		if (input.height !== nextHeight) {
			input.height = nextHeight;
		}
		
		messages.bottom = nextHeight + status.height;
		updateComposerPlaceholder();
		screen.render();
	};

	const refreshComposer = () => {
		clearComposerResizeTimer();
		composerResizeTimer = setTimeout(() => {
			composerResizeTimer = null;
			resizeComposer();
		}, 0);
	};

	const saveDraft = () => {
		const value = getComposerValue();

		if (value.trim()) {
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

	const appendLine = (content) => {
		messages.log(content);
		messages.setScrollPerc(100);
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
				messages.setScrollPerc(100);
				return;
			}

			messages.pushLine(renderedLine);
			messages.setScrollPerc(100);
		});

		screen.render();
	};

	const focusInput = () => {
		input.focus();
		screen.program.showCursor(true);
		updateComposerPlaceholder();
		screen.render();
	};

	const sendCurrentMessage = () => {
		const raw = getComposerValue();
		const text = stripTags(raw).trim();

		if (!text) {
			return false;
		}

		if (!socket || socket.readyState !== WebSocket.OPEN) {
			appendLine(`{red-fg}${formatTime()} Cannot send: not connected{/red-fg}`);
			stopTyping();
			focusInput();
			return false;
		}

		try {
			stopTyping();
			clearDraftTimer();
			socket.send(JSON.stringify({ message: text }));
			config.set(draftKey, "");
			composerShowingPlaceholder = false;
			showComposerPlaceholder();
			updateComposerPlaceholder();
			resizeComposer();
			setStatus("{green-fg}Message sent{/green-fg}", "green");
		} catch (error) {
			appendLine(
				`{red-fg}${formatTime()} Send failed: ${error.message || error}{/red-fg}`,
			);
			setStatus("{red-fg}Send failed{/red-fg}", "red");
			return false;
		}

		focusInput();
		return true;
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
				const parsed = JSON.parse(data);

				if (parsed.type === "presence") {
					updatePresenceState(parsed);
					return;
				}

				if (parsed.type === "message") {
					const rawMessage = String(parsed.message || "").trim();
					if (!rawMessage) {
						return;
					}
					parsed.message = rawMessage;
				}

				const normalized = normalizeMessage(parsed);
				const timestamp = formatTime();

				if (normalized.type === "system") {
					appendLine(`{gray-fg}${timestamp} • ${normalized.message}{/gray-fg}`);
					return;
				}

				if (normalized.type === "error") {
					appendLine(`{red-fg}${timestamp} • ${normalized.message}{/red-fg}`);
					return;
				}

				if (currentUsername && normalized.username === currentUsername) {
					const prefix = `{gray-fg}${timestamp}{/gray-fg} {green-fg}You{/green-fg}: `;
					appendWrappedMessage(
						prefix,
						normalized.message,
						stripTags(prefix).length,
					);
					return;
				}

				const prefix = `{gray-fg}${timestamp}{/gray-fg} {cyan-fg}${normalized.username}{/cyan-fg}: `;
				appendWrappedMessage(prefix, normalized.message, stripTags(prefix).length);
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
		clearComposerResizeTimer();
		clearTypingTimer();
		sendTypingState(false);
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

	const savedDraft = String(config.get(draftKey) || "");
	if (savedDraft.trim()) {
		composerShowingPlaceholder = false;
		input.style.fg = "white";
		input.setValue(savedDraft);
	} else {
		showComposerPlaceholder();
	}
	resizeComposer();
	connect();

	screen.key(["escape", "q", "C-c"], () => cleanup(0));
	input.key(["C-c"], () => cleanup(0));
	screen.key(["C-s"], () => sendCurrentMessage());

	screen.key(["C-l"], () => {
		messages.setContent("");
		appendLine("{center}{gray-fg}Chat history cleared{/gray-fg}{/center}");
		focusInput();
	});

	screen.on("resize", () => {
		refreshComposer();
	});

	process.on("SIGINT", () => cleanup(0));

	input.on("keypress", (ch, key) => {
		if (key && (key.name === "enter" || key.name === "return")) {
			stopTyping();
			const sent = sendCurrentMessage();
			if (sent) {
				setTimeout(() => {
					composerShowingPlaceholder = false;
					showComposerPlaceholder();
					updateComposerPlaceholder();
					resizeComposer();
				}, 0);
			}
			return;
		}

		if (key && key.ctrl && key.name === "s") {
			return;
		}

		markTyping();
		refreshComposer();
		scheduleDraftSave();
	});

	input.on("blur", () => {
		if (!hasComposerText()) {
			showComposerPlaceholder();
		}

		stopTyping();
		refreshComposer();
	});

	input.on("focus", () => {
		hideComposerPlaceholder();
		refreshComposer();
	});

	focusInput();
	setStatus(
		"{yellow-fg}Ready{/yellow-fg} - Enter sends the message",
		"yellow",
	);
	screen.render();

	input.on("keypress", (ch, key) => {
		if (!composerShowingPlaceholder) {
			return;
		}

		if (!ch || (key && (key.ctrl || key.meta))) {
			return;
		}

		if (key && (key.name === "enter" || key.name === "return")) {
			return;
		}

		hideComposerPlaceholder();
	});
};
