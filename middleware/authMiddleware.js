// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Prüfen, ob ein Authorization-Header im Format "Bearer <token>" vorhanden ist
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Kein Token vorhanden oder falsches Format" });
  }

  // "Bearer " entfernen und Token extrahieren
  const rawToken = authHeader.slice(7).trim();

  // Anführungszeichen am Anfang/Ende entfernen, falls z.B. "token" gesendet wurde
  const token = rawToken.replace(/^"|"$/g, "");

  try {
    // Token prüfen und Payload auslesen
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Daten des eingeloggten Nutzers im Request-Objekt speichern
    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    return next();
  } catch (err) {
    // Bei ungültigem oder abgelaufenem Token eine einheitliche Fehlermeldung zurückgeben
    return res
      .status(401)
      .json({ message: "Ungültiger oder abgelaufener Token" });
  }
}

module.exports = authMiddleware;
