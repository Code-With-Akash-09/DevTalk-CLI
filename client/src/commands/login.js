const axios = require('axios')
const chalkModule = require('chalk')
const chalk = chalkModule && chalkModule.default ? chalkModule.default : chalkModule
const ConfModule = require('conf')
const Conf = ConfModule && ConfModule.default ? ConfModule.default : ConfModule
const inquirerModule = require('inquirer')
const inquirer = inquirerModule && inquirerModule.default ? inquirerModule.default : inquirerModule

const config = new Conf({
    projectName: 'devtalk-cli',
})

module.exports = async () => {
    let answers
    try {
        answers = await inquirer.prompt([
            {
                name: 'email',
                message: 'Email:',
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password:',
            },
        ])
    } catch (err) {
        console.log(chalk.red('\nPrompt cancelled'))
        return
    }

    try {
        const response = await axios.post(
            'https://devtalk-cli.onrender.com/v1/auth/login',
            answers
        )

        config.set('token', response.data.token)

        console.log(chalk.green('Login successful'))
    } catch (error) {
        console.log(chalk.red(error.response?.data?.message || error.message))
    }
}