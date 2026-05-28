#!/usr/bin/env node
const axios = require('axios')
const { Command } = require('commander')
const chat = require('./commands/chat')
const login = require('./commands/login')
const register = require('./commands/register')
const { name, version } = require('../package.json')

function compareVersions(currentVersion, latestVersion) {
	const currentParts = currentVersion.split('.').map(Number)
	const latestParts = latestVersion.split('.').map(Number)

	for (let index = 0; index < 3; index += 1) {
		const currentPart = currentParts[index] || 0
		const latestPart = latestParts[index] || 0

		if (currentPart > latestPart) return 1
		if (currentPart < latestPart) return -1
	}

	return 0
}

async function checkForUpdates() {
	try {
		const response = await axios.get(
			`https://registry.npmjs.org/${name}/latest`,
			{
				timeout: 3000,
			}
		)

		const latestVersion = response.data.version

		if (latestVersion && compareVersions(version, latestVersion) < 0) {
			console.log(
				`A new version of ${name} is available: ${version} -> ${latestVersion}`
			)
			console.log(`Run: npm install -g ${name}`)
		}
	} catch (error) {
		// Ignore version check failures so the CLI still starts offline.
	}
}

async function main() {
	await checkForUpdates()

	const program = new Command()

	program.name('devtalk-cli')
	program.version(version)

	program.command('register').action(register)
	program.command('login').action(login)
	program.command('chat').action(chat)

	await program.parseAsync(process.argv)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})