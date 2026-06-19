const express = require("express");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const setupSwagger = require("./swagger/userSwagger");

const app = express();

app.use(express.json());

setupSwagger(app);

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "user-management-service",
  });
});

app.get("/", (req, res) => {
  res.send("User Management Service API läuft 🚀");
});

module.exports = app;