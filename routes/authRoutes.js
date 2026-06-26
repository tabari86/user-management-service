// routes/authRoutes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
    authRateLimiter,
    passwordResetRateLimiter,
} = require("../middleware/rateLimiters");

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and password management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and stores the password as a bcrypt hash.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Test User
 *               email:
 *                 type: string
 *                 example: testuser@example.com
 *               password:
 *                 type: string
 *                 example: TestPassword123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email or password missing
 *       409:
 *         description: User already exists
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post("/register", authRateLimiter, authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user and returns a JWT token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: testuser@example.com
 *               password:
 *                 type: string
 *                 example: TestPassword123!
 *     responses:
 *       200:
 *         description: Login successful, JWT token returned
 *       400:
 *         description: Email or password missing
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post("/login", authRateLimiter, authController.login);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     description: Creates a password reset token for an active user account and sends a reset link by email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: testuser@example.com
 *     responses:
 *       200:
 *         description: Generic password reset response returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zuruecksetzen des Passworts gesendet
 *       400:
 *         description: Email missing
 *       403:
 *         description: User account is disabled
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error or email delivery failure
 */
router.post(
    "/forgot-password",
    passwordResetRateLimiter,
    authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Resets the password using a valid password reset token. The new password must follow the strong password policy.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: reset-token-from-email
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Passwort wurde zurueckgesetzt
 *       400:
 *         description: Missing fields, weak password, invalid token, or expired token
 *       403:
 *         description: User account is disabled
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
router.post("/reset-password", authRateLimiter, authController.resetPassword);

module.exports = router;