const cors = require('cors')
require('dotenv').config()
const express = require('express')
const http = require('http')
const jwt = require('jsonwebtoken')
const WebSocket = require('ws')
const { WebSocketServer } = require('ws')
const { getDb } = require('./config/collection')
const authRouter = require('./routes/auth')

const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
    })
})

app.use("/v1/auth", authRouter)

getDb()

const server = http.createServer(app)

const wss = new WebSocketServer({ server })

const clients = new Map()

wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url.replace("/?", ""))

    const token = params.get("token")

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET)
        clients.set(ws, user)

        broadcast({
            type: "system",
            message: `${user.username} joined the chat`,
        })

        console.log(`WS: ${user.username} connected from ${req.socket.remoteAddress}`)

        ws.on("message", (message) => {
            try {
                const parsed = JSON.parse(message)

                broadcast({
                    type: "message",
                    username: user.username,
                    message: parsed.message,
                })
            } catch (err) {
                console.error('WS message parse error for', user.username, err.message)
                // notify the sender but do not close the socket
                try {
                    ws.send(JSON.stringify({ type: 'error', message: 'invalid message format' }))
                } catch (sendErr) {
                    console.error('Failed to send parse error to client', sendErr.message)
                }
            }
        })

        ws.on("close", () => {
            clients.delete(ws)

            broadcast({
                type: "system",
                message: `${user.username} left the chat`,
            })
            console.log(`WS: ${user.username} disconnected`)
        })
    } catch (error) {
        ws.close()
    }
})

function broadcast(data) {
    const message = JSON.stringify(data)

    for (const client of clients.keys()) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    }
}

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})

module.exports = server