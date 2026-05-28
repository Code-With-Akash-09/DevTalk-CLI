const { MongoClient, ServerApiVersion } = require('mongodb')

const uri = process.env.COMMUNITY_URI
if (!uri) throw new Error('Missing COMMUNITY_URI in env')

let client
let clientPromise

if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        })
        global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
} else {
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    })
    clientPromise = client.connect()
}

module.exports = clientPromise
