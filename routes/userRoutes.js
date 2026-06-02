// routes/userRoutes.js

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Protected user profile routes
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the currently authenticated user's profile data.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile returned successfully
 *       401:
 *         description: Missing, invalid or expired JWT token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/me", authMiddleware, userController.getMe);

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user profile
 *     description: Updates the currently authenticated user's profile data.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated User
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       400:
 *         description: No valid fields provided
 *       401:
 *         description: Missing, invalid or expired JWT token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put("/me", authMiddleware, userController.updateMe);

module.exports = router;