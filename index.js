// index.js

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

// 1) Umgebungsvariablen aus .env laden
require("dotenv").config();

// 2) Express und Mongoose importieren
const express = require("express");
const mongoose = require("mongoose");

// 3) Express-App erstellen
const app = express();

// 4) Konfiguration: Port & MongoDB-URL aus .env
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// 5) Middleware: JSON-Body parsen
app.use(express.json());

// Auth-Routen
app.use("/auth", authRoutes);

// User-Routen
app.use("/users", userRoutes);

// 6) Test-Route (Health-Check)
app.get("/", (req, res) => {
  res.send("User Management Service API läuft 🚀");
});

// 7) Mit MongoDB verbinden und Server starten
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Mit MongoDB verbunden");
    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(" Konnte nicht mit MongoDB verbinden:", err.message);
    process.exit(1);
  });
