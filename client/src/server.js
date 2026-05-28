const { Command } = require('commander')
const chat = require('./commands/chat')
const login = require('./commands/login')
const register = require('./commands/register')

const program = new Command()

program.name('devtalk-cli')

program.command('register').action(register)
program.command('login').action(login)
program.command('chat').action(chat)

program.parse(process.argv)