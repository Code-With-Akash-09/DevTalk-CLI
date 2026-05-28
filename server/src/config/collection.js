const clientPromise = require('./db')

async function getDb() {
    const client = await clientPromise
    return client.db('devtalk-cli')
}

async function userscoll() {
    const db = await getDb()
    return db.collection('users')
}

module.exports = { getDb, userscoll }