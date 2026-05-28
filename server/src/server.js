import cors from 'cors'
import "dotenv/config"
import express from 'express'
import http from 'http'
import jwt from 'jsonwebtoken'
import WebSocket, { WebSocketServer } from 'ws'
import { getDb } from './config/collection.js'
import authRouter from './routes/auth.js'

const app = express()

app.use(cors())
app.use(express.json())

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

        ws.on("message", (message) => {
            const parsed = JSON.parse(message)

            broadcast({
                type: "message",
                username: user.username,
                message: parsed.message,
            })
        })

        ws.on("close", () => {
            clients.delete(ws)

            broadcast({
                type: "system",
                message: `${user.username} left the chat`,
            })
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