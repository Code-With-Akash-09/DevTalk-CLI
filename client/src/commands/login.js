const axios = require('axios')
const chalk = require('chalk')
const Conf = require('conf')
const inquirer = require('inquirer')

const config = new Conf({
    projectName: 'devtalk-cli',
})

module.exports = async () => {
    const answers = await inquirer.prompt([
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

    try {
        const response = await axios.post(
            'http://devtalk-cli.onrender.com/v1/auth/login',
            answers
        )

        config.set('token', response.data.token)

        console.log(chalk.green('Login successful'))
    } catch (error) {
        console.log(chalk.red(error.response.data.message))
    }
}