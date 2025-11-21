// routes/userRoutes.js

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// Eigene Daten abfragen
router.get("/me", authMiddleware, userController.getMe);

// Eigene Daten aktualisieren
router.put("/me", authMiddleware, userController.updateMe);

module.exports = router;
