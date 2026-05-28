import clientPromise from "./db.js";

export async function getDb() {
    const client = await clientPromise;
    return client.db("devtalk-cli");
}

export async function userscoll() {
    const db = await getDb();
    return db.collection("users");
}