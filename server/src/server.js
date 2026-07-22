const cors = require('cors')
require('dotenv').config()
const express = require('express')
const http = require('http')
const jwt = require('jsonwebtoken')
const WebSocket = require('ws')
const { WebSocketServer } = require('ws')
const { getDb, messagescoll } = require('./config/collection')
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

wss.on("connection", async (ws, req) => {
    const params = new URLSearchParams(req.url.replace(/^.*\?/, ""))

    const token = params.get("token")
    const room = params.get("room") || "general"

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET)
        clients.set(ws, { ...user, room })

        // Fetch recent messages for room from MongoDB
        try {
            const collection = await messagescoll()
            const history = await collection.find({ room }).sort({ createdAt: -1 }).limit(50).toArray()
            history.reverse()
            ws.send(JSON.stringify({ type: "history", room, messages: history }))
        } catch (dbErr) {
            console.error("Failed to fetch chat history:", dbErr.message)
        }

        broadcastInRoom(room, {
            type: "system",
            room,
            message: `${user.username} joined #${room}`,
        })

        console.log(`WS: ${user.username} connected to #${room} from ${req.socket.remoteAddress}`)

        ws.on("message", async (message) => {
            try {
                const parsed = JSON.parse(message)
                const text = parsed.message

                const msgObj = {
                    type: "message",
                    username: user.username,
                    room,
                    message: text,
                    createdAt: new Date(),
                }

                // Persist to MongoDB
                try {
                    const collection = await messagescoll()
                    const res = await collection.insertOne(msgObj)
                    console.log(`DB Persisted message from ${user.username} (id: ${res.insertedId})`)
                } catch (dbErr) {
                    console.error("Failed to persist message:", dbErr.message)
                }

                broadcastInRoom(room, msgObj)
            } catch (err) {
                console.error('WS message parse error for', user.username, err.message)
                try {
                    ws.send(JSON.stringify({ type: 'error', message: 'invalid message format' }))
                } catch (sendErr) {
                    console.error('Failed to send parse error to client', sendErr.message)
                }
            }
        })

        ws.on("close", () => {
            clients.delete(ws)

            broadcastInRoom(room, {
                type: "system",
                room,
                message: `${user.username} left #${room}`,
            })
            console.log(`WS: ${user.username} disconnected from #${room}`)
        })
    } catch (error) {
        ws.close()
    }
})

function broadcastInRoom(room, data) {
    const message = JSON.stringify(data)

    for (const [client, info] of clients.entries()) {
        if (info.room === room && client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    }
}

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})

module.exports = server