const axios = require("axios");
const chalkModule = require("chalk");
const chalk =
	chalkModule && chalkModule.default ? chalkModule.default : chalkModule;
const inquirerModule = require("inquirer");
const inquirer =
	inquirerModule && inquirerModule.default
		? inquirerModule.default
		: inquirerModule;
const config = require("../config/store");

module.exports = async () => {
	let answers;
	try {
		answers = await inquirer.prompt([
			{
				name: "email",
				message: "Email:",
			},
			{
				type: "password",
				name: "password",
				message: "Password:",
			},
		]);
	} catch (err) {
		console.log(chalk.red("\nPrompt cancelled"));
		return;
	}

	try {
		const baseUrl = process.env.API_URL || (process.env.DEV_HOST ? `http://${process.env.DEV_HOST}` : "https://devtalk-cli.onrender.com");
		const response = await axios.post(
			`${baseUrl}/v1/auth/login`,
			answers,
		);

		config.set("token", response.data.token);

		console.log(chalk.green("Login successful"));
	} catch (error) {
		console.log(chalk.red(error.response?.data?.message || error.message));
	}
};
