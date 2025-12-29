import { body } from "express-validator";

export const registerValidationRules = [
  body("fullName")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .isLength({ min: 3 }).withMessage("Full name must be at least 3 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email")
    .normalizeEmail(),

  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3 }).withMessage("Username must be at least 3 characters")
    .toLowerCase(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Min 8 characters required")
    .matches(/[A-Z]/).withMessage("Must include uppercase letter")
    .matches(/[0-9]/).withMessage("Must include a number")
    .matches(/[!@#$%^&*]/).withMessage("Must include special character"),
];
