const { Router } = require('express')
const { login, register } = require('../controller/auth')

const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)

module.exports = authRouter