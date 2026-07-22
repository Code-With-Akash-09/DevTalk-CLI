const clientPromise = require('./db')

const TTL_SECONDS = 24 * 60 * 60 // 24 hours

async function getDb() {
    const client = await clientPromise
    return client.db('devtalk-cli')
}

async function userscoll() {
    const db = await getDb()
    return db.collection('users')
}

async function messagescoll() {
    const db = await getDb()
    return db.collection('messages')
}

// Ensure TTL index so messages auto-expire after 24 hours
async function ensureIndexes() {
    try {
        const collection = await messagescoll()
        await collection.createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: TTL_SECONDS, background: true }
        )
        console.log('DB: TTL index ensured (messages expire after 24h)')
    } catch (err) {
        console.error('DB: Failed to create TTL index:', err.message)
    }
}

module.exports = { getDb, userscoll, messagescoll, ensureIndexes }