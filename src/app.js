import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { errorHandler } from "./middlewares/error.middleware.js";
const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes would go here
import userRouter from "./routes/user.routes.js";

// USER ROUTES
app.use("/api/v1/users", userRouter)

// GLOBAL ERROR HANDLER (must be last)
app.use(errorHandler);

export { app }