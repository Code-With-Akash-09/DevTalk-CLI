import { Router } from "express";
import { login, register } from "../controller/auth.js";

const authRouter = Router();

authRouter.post("/register", register)
authRouter.post("/login", login)

export default authRouter