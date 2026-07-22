const { messagescoll } = require('../config/collection')

async function listRooms(req, res) {
    try {
        const collection = await messagescoll()
        const rooms = await collection.distinct('room')
        res.status(200).json({ rooms })
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch rooms' })
    }
}

module.exports = { listRooms }
