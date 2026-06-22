// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check if an Authorization header in the format "Bearer <token>" is present
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Kein Token vorhanden oder falsches Format" });
  }

  // Remove "Bearer " and extract token
  const rawToken = authHeader.slice(7).trim();

  // Remove surrounding quotes if a token was sent as "token"
  const token = rawToken.replace(/^"|"$/g, "");

  try {
    // Verify token and read payload
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    if (user.status === "disabled") {
      return res.status(403).json({ message: "Benutzerkonto ist deaktiviert" });
    }

    // Store authenticated user data from the database, not only from the token
    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    return next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Ungültiger oder abgelaufener Token" });
  }
}

module.exports = authMiddleware;