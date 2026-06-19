// middleware/requireRole.js

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Authentifizierung erforderlich" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Zugriff verweigert" });
    }

    return next();
  };
}

module.exports = requireRole;