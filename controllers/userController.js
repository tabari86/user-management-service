// controllers/userController.js

const User = require("../models/user");
const bcrypt = require("bcrypt");
const { validatePasswordPolicy } = require("../utils/passwordPolicy");

// GET /users
exports.listUsers = async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    const { status, role } = req.query;

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        message: "page muss eine Zahl groesser oder gleich 1 sein",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({
        message: "limit muss zwischen 1 und 50 liegen",
      });
    }

    if (status !== undefined && !["active", "disabled"].includes(status)) {
      return res.status(400).json({
        message: "status muss active oder disabled sein",
      });
    }

    if (role !== undefined && !["user", "admin"].includes(role)) {
      return res.status(400).json({
        message: "role muss user oder admin sein",
      });
    }

    const filter = {};

    if (status !== undefined) {
      filter.status = status;
    }

    if (role !== undefined) {
      filter.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (err) {
    console.error("Fehler bei listUsers:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// PATCH /users/me/password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "currentPassword und newPassword sind erforderlich",
      });
    }

    const passwordValidation = validatePasswordPolicy(newPassword);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    if (user.status === "disabled") {
      return res.status(403).json({ message: "Benutzerkonto ist deaktiviert" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Aktuelles Passwort ist ungültig" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Passwort aktualisiert" });
  } catch (err) {
    console.error("Fehler bei changePassword:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// PATCH /users/:id/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({
        message: "status muss active oder disabled sein",
      });
    }

    const now = new Date();

    const updateData = {
      status,
      statusChangedAt: now,
      statusChangedBy: req.user.id,
    };

    if (status === "disabled") {
      updateData.disabledAt = now;
    }

    if (status === "active") {
      updateData.activatedAt = now;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        select: "-passwordHash",
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    res.json({
      message: "Benutzerstatus aktualisiert",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Fehler bei updateUserStatus:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// GET /users/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    res.json(user);
  } catch (err) {
    console.error("Fehler bei getMe:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// PUT /users/me
exports.updateMe = async (req, res) => {
  try {
    const { name } = req.body;

    const updateData = {};
    if (typeof name === "string" && name.trim() !== "") {
      updateData.name = name.trim();
    }

    // wenn nichts zu ändern ist
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "Keine gültigen Felder zum Aktualisieren übergeben" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      select: "-passwordHash",
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    res.json({
      message: "Profil aktualisiert",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Fehler bei updateMe:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};
