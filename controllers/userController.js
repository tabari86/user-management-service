// controllers/userController.js

const User = require("../models/user");

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
