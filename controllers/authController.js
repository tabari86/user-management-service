// controllers/authController.js

const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email und password sind erforderlich" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Ein Benutzer mit dieser E-Mail existiert bereits" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      passwordHash,
      name,
    });

    const savedUser = await user.save();

    res.status(201).json({
      _id: savedUser._id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
      createdAt: savedUser.createdAt,
    });
  } catch (err) {
    console.error("Fehler bei register:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email und password sind erforderlich" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "E-Mail oder Passwort ist ungültig" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "E-Mail oder Passwort ist ungültig" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Fehler bei login:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};
