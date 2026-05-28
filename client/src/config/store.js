const fs = require('fs')
const os = require('os')
const path = require('path')

const appName = 'devtalk-cli'
const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, appName)
    : path.join(os.homedir(), '.config', appName)
const configFile = path.join(configDir, 'config.json')

function ensureConfigDir() {
    fs.mkdirSync(configDir, { recursive: true })
}

function readStore() {
    try {
        const raw = fs.readFileSync(configFile, 'utf8')
        return JSON.parse(raw)
    } catch (error) {
        return {}
    }
}

function writeStore(data) {
    ensureConfigDir()
    fs.writeFileSync(configFile, JSON.stringify(data, null, 2), 'utf8')
}

function get(key) {
    const store = readStore()
    return store[key]
}

function set(key, value) {
    const store = readStore()
    store[key] = value
    writeStore(store)
}

module.exports = {
    get,
    set,
}