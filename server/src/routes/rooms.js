const { Router } = require('express')
const authMiddleware = require('../middleware/auth')
const { listRooms } = require('../controller/rooms')

const roomsRouter = Router()

roomsRouter.get('/', authMiddleware, listRooms)

module.exports = roomsRouter
