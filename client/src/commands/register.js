import axios from "axios"
import chalk from "chalk"
import inquirer from "inquirer"

export default async () => {
    const answers = await inquirer.prompt([
        {
            name: "username",
            message: "Username:",
        },
        {
            name: "email",
            message: "Email:",
        },
        {
            type: "password",
            name: "password",
            message: "Password:",
        },
    ])

    try {
        await axios.post(
            "http://devtalk-cli.onrender.com/v1/auth/register",
            answers
        )

        console.log(chalk.green("Registration successful"))
    } catch (error) {
        console.log(chalk.red(error.response.data.message))
    }
}