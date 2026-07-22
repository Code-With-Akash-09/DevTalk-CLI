const axios = require("axios");
const chalkModule = require("chalk");
const chalk =
	chalkModule && chalkModule.default ? chalkModule.default : chalkModule;
const config = require("../config/store");

module.exports = async () => {
	const token = config.get("token");

	if (!token) {
		console.log(chalk.red("You must be logged in to view rooms."));
		console.log(chalk.dim("Run: node src/server.js login"));
		return;
	}

	try {
		const response = await axios.get(
			"https://devtalk-cli.onrender.com/v1/rooms",
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);

		const rooms = response.data.rooms;

		if (!rooms || rooms.length === 0) {
			console.log(chalk.yellow("No rooms found. Start chatting to create one!"));
			console.log(chalk.dim("Run: node src/server.js chat --room <name>"));
			return;
		}

		console.log(chalk.bold.cyanBright("\n Available Rooms\n"));
		rooms.forEach((room) => {
			console.log(chalk.cyan(`  # ${room}`));
		});
		console.log("");
		console.log(
			chalk.dim(`Join a room: node src/server.js chat --room <name>`),
		);
		console.log("");
	} catch (error) {
		if (error.response?.status === 401) {
			console.log(chalk.red("Session expired. Please login again."));
		} else {
			console.log(
				chalk.red("Failed to fetch rooms: " + (error.response?.data?.message || error.message)),
			);
		}
	}
};
