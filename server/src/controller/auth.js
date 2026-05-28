const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { userscoll } = require('../config/collection')

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body
        const usersColl = await userscoll()

        const isUserExist = await usersColl.findOne({
            $or: [{ email }, { username }],
        })

        if (isUserExist) {
            return res.status(400).json({
                message: "User already exists",
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const data = {
            username,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const result = await usersColl.insertOne(data)

        return res.status(201).json({
            message: "User registered successfully",
            userId: result.insertedId,
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const usersColl = await userscoll()

        const user = await usersColl.findOne({ email })

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials",
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid credentials",
            })
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                username: user.username,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        )

        res.json({
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
            },
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message,
        })
    }
}

module.exports = { login, register }

