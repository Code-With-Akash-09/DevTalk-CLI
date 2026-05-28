const blessed = require('blessed')
const WebSocket = require('ws')
const chalkModule = require('chalk')
const chalk = chalkModule && chalkModule.default ? chalkModule.default : chalkModule
const config = require('../config/store')

module.exports = async () => {
    const token = config.get('token')

    if (!token) {
        console.log(chalk.red('No token found. Please run `devtalk-cli login` first.'))
        process.exit(0)
    }

    const screen = blessed.screen({
        smartCSR: true,
        title: 'DevTalk-CLI',
    })

    const messages = blessed.box({
        top: 0,
        left: 0,
        width: "100%",
        height: "90%",
        border: {
            type: "line",
        },
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true,
        tags: true,
    })

    const input = blessed.textbox({
        bottom: 0,
        left: 0,
        width: "100%",
        height: "10%",
        border: {
            type: "line",
        },
        inputOnFocus: true,
    })

    screen.append(messages)
    screen.append(input)

    messages.pushLine('{center}{bold}DevTalk-CLI{/bold}{/center}')
    messages.pushLine('')

    const defaultHost = process.env.DEV_HOST || 'devtalk-cli.onrender.com'
    const wsUrl = process.env.WS_URL || `wss://${defaultHost}?token=${token}`

    let socket = new WebSocket(wsUrl)

    screen.render()

    socket.on('open', () => {
        messages.pushLine('{green-fg}Connected to server{/green-fg}')
        screen.render()
    })

    socket.on('error', (err) => {
        messages.pushLine(`{red-fg}WebSocket error: ${err.message || err}{/red-fg}`)
        screen.render()
    })

    socket.on('close', (code, reason) => {
        messages.pushLine(`{yellow-fg}Disconnected (code=${code}){/yellow-fg}`)
        messages.pushLine('{yellow-fg}If this happens immediately after sending a message, your connection may be closing on the server due to an error or invalid token.{/yellow-fg}')
        screen.render()
    })

    let exiting = false
    const cleanup = (exitCode = 0) => {
        if (exiting) return
        exiting = true

        try {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close(1000, 'client_close')
            }
        } catch (err) {
        }

        try {
            screen.destroy()
        } catch (err) {
        }

        setTimeout(() => process.exit(exitCode), 300)
    }

    screen.key(['escape', 'q', 'C-c'], () => cleanup(0))

    input.key(['C-c'], () => cleanup(0))

    process.on('SIGINT', () => cleanup(0))

    socket.on("message", (data) => {
        const parsed = JSON.parse(data)

        messages.pushLine(
            `${parsed.username || "System"}: ${parsed.message}`
        )

        screen.render()
    })

    input.on('submit', (value) => {
        const text = String(value || '').trim()

        if (!text) {
            input.clearValue()
            input.focus()
            screen.program.showCursor(true)
            screen.render()
            return
        }

        if (socket.readyState !== WebSocket.OPEN) {
            messages.pushLine('{red-fg}Cannot send message: not connected{/red-fg}')
            screen.render()
            input.focus()
            screen.program.showCursor(true)
            return
        }

        try {
            socket.send(JSON.stringify({ message: text }))
        } catch (err) {
            messages.pushLine(`{red-fg}Send failed: ${err.message || err}{/red-fg}`)
        }

        input.clearValue()
        input.focus()
        screen.program.showCursor(true)
        screen.render()
    })

    input.focus()

    screen.key(["escape", "q", "C-c"], () => {
        process.exit(0)
    })

    screen.render()
}