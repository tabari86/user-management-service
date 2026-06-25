// routes/userRoutes.js

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");


/**
 * @swagger
 * /users:
 *   get:
 *     summary: List users
 *     description: Returns paginated user accounts. This endpoint is restricted to users with the admin role.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, disabled]
 *         description: Filter users by account status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter users by role
 *     responses:
 *       200:
 *         description: Users returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 65f1c2a9b7a7c91234567890
 *                       email:
 *                         type: string
 *                         example: user@example.com
 *                       name:
 *                         type: string
 *                         example: Test User
 *                       role:
 *                         type: string
 *                         enum: [user, admin]
 *                         example: user
 *                       status:
 *                         type: string
 *                         enum: [active, disabled]
 *                         example: active
 *                       statusChangedAt:
 *                         type: string
 *                         format: date-time
 *                       disabledAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       activatedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalUsers:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Missing, invalid or expired JWT token
 *       403:
 *         description: Admin role required
 *       500:
 *         description: Internal server error
 */
router.get("/", authMiddleware, requireRole("admin"), userController.listUsers);

/**
 * @swagger
 * /users/me/password:
 *   patch:
 *     summary: Change current user password
 *     description: Updates the password of the currently authenticated user after validating the current password.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldPassword123
 *               newPassword:
 *                 type: string
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Passwort aktualisiert
 *       400:
 *         description: Missing password fields or invalid new password
 *       401:
 *         description: Missing, invalid or expired JWT token, or invalid current password
 *       403:
 *         description: User account is disabled
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.patch("/me/password", authMiddleware, userController.changePassword);

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Update user account status
 *     description: Activates or disables a user account. This endpoint is restricted to users with the admin role.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, disabled]
 *                 example: disabled
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Benutzerstatus aktualisiert
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 65f1c2a9b7a7c91234567890
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       example: Test User
 *                     role:
 *                       type: string
 *                       example: user
 *                     status:
 *                       type: string
 *                       enum: [active, disabled]
 *                       example: disabled
 *                     statusChangedAt:
 *                       type: string
 *                       format: date-time
 *                     statusChangedBy:
 *                       type: string
 *                       example: 65f1c2a9b7a7c91234567891
 *                     disabledAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     activatedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Missing, invalid or expired JWT token
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.patch(
    "/:id/status",
    authMiddleware,
    requireRole("admin"),
    userController.updateUserStatus
);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and admin user management routes
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