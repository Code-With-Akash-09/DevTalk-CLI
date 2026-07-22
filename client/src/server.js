#!/usr/bin/env node
const axios = require("axios");
const chalkModule = require("chalk");
const chalk =
	chalkModule && chalkModule.default ? chalkModule.default : chalkModule;
const { Command } = require("commander");
const chat = require("./commands/chat");
const login = require("./commands/login");
const register = require("./commands/register");
const rooms = require("./commands/rooms");
const { name, version } = require("../package.json");

function printBanner() {
	const logo = String.raw`
 ██████╗ ███████╗██╗   ██╗████████╗ █████╗ ██╗     ██╗  ██╗
 ██╔══██╗██╔════╝██║   ██║╚══██╔══╝██╔══██╗██║     ██║ ██╔╝
 ██║  ██║█████╗  ██║   ██║   ██║   ███████║██║     █████╔╝
 ██║  ██║██╔══╝  ╚██╗ ██╔╝   ██║   ██╔══██║██║     ██╔═██╗
 ██████╔╝███████╗ ╚████╔╝    ██║   ██║  ██║███████╗██║  ██╗
  ╚═════╝ ╚══════╝  ╚═══╝     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
`;
	console.log(chalk.cyanBright(logo));
	console.log(chalk.bold("DevTalk CLI"));
	console.log(
		chalk.dim("Realtime terminal chat for fast team conversations\n"),
	);
}

function compareVersions(currentVersion, latestVersion) {
	const currentParts = currentVersion.split(".").map(Number);
	const latestParts = latestVersion.split(".").map(Number);

	for (let index = 0; index < 3; index += 1) {
		const currentPart = currentParts[index] || 0;
		const latestPart = latestParts[index] || 0;

		if (currentPart > latestPart) return 1;
		if (currentPart < latestPart) return -1;
	}

	return 0;
}

async function checkForUpdates() {
	try {
		const response = await axios.get(
			`https://registry.npmjs.org/${name}/latest`,
			{
				timeout: 3000,
			},
		);

		const latestVersion = response.data.version;

		if (latestVersion && compareVersions(version, latestVersion) < 0) {
			console.log(
				`A new version of ${name} is available: ${version} -> ${latestVersion}`,
			);
			console.log(`Run: npm install -g ${name}`);
		}
	} catch (error) {
		// Ignore version check failures so the CLI still starts offline.
	}
}

async function main() {
	printBanner();
	await checkForUpdates();

	const program = new Command();

	program.name("devtalk-cli");
	program.version(version);

	program.command("register").action(register);
	program.command("login").action(login);
	program.command("rooms").description("List all available rooms").action(rooms);
	program.command("chat").option("-r, --room <room>", "Room to join", "general").action(chat);

	await program.parseAsync(process.argv);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
