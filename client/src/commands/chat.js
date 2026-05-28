import blessed from "blessed"
import Conf from "conf"
import WebSocket from "ws"

const config = new Conf({
    projectName: "devtalk-cli",
})

export default async () => {
    const token = config.get("token")
    const screen = blessed.screen({
        smartCSR: true,
        title: "DevTalk-CLI",
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

    const socket = new WebSocket(
        `ws://devtalk-cli.onrender.com?token=${token}`
    )

    socket.on("message", (data) => {
        const parsed = JSON.parse(data)

        messages.pushLine(
            `${parsed.username || "System"}: ${parsed.message}`
        )

        screen.render()
    })

    input.on("submit", (value) => {
        socket.send(
            JSON.stringify({
                message: value,
            })
        )

        input.clearValue()
        screen.render()
    })

    input.focus()

    screen.key(["escape", "q", "C-c"], () => {
        process.exit(0)
    })

    screen.render()
}