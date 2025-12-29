import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { registerValidationRules } from "../validators/user.validators.js";
import { validate } from "../middlewares/validate.js";


const router = Router();  

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerValidationRules,
    validate,
    registerUser
    )

export default router