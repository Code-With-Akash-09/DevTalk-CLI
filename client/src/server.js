import { Command } from 'commander'
import chat from './commands/chat.js'
import login from './commands/login.js'
import register from './commands/register.js'

const program = new Command()

program.name("devtalk-cli")

program.command("register").action(register)
program.command("login").action(login)
program.command("chat").action(chat)

program.parse(process.argv)