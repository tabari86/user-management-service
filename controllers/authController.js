// controllers/authController.js

const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");
const { validatePasswordPolicy } = require("../utils/passwordPolicy");

const PASSWORD_RESET_REQUEST_MESSAGE =
  "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zuruecksetzen des Passworts gesendet";
const INVALID_OR_EXPIRED_RESET_TOKEN_MESSAGE =
  "Ungueltiger oder abgelaufener Reset-Token";

// POST /auth/register
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email und password sind erforderlich" });
    }

    const passwordValidation = validatePasswordPolicy(password);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
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
      status: savedUser.status,
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

    if (user.status === "disabled") {
      return res.status(403).json({ message: "Benutzerkonto ist deaktiviert" });
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
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Fehler bei login:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// POST /auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email ist erforderlich" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
    }

    if (user.status === "disabled") {
      return res.status(403).json({ message: "Benutzerkonto ist deaktiviert" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expiryMinutes =
      Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) || 15;

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = new Date(
      Date.now() + expiryMinutes * 60 * 1000
    );

    await user.save();

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const resetLink = `${appBaseUrl.replace(
      /\/$/,
      ""
    )}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetLink,
      });
    } catch (emailErr) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();

      console.error("Fehler beim Senden der Password-Reset-E-Mail:", emailErr);
      return res.status(500).json({ message: "Interner Serverfehler" });
    }

    return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  } catch (err) {
    console.error("Fehler bei forgotPassword:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "token und newPassword sind erforderlich",
      });
    }

    const passwordValidation = validatePasswordPolicy(newPassword);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
    }


    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: resetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return res.status(400).json({
        message: INVALID_OR_EXPIRED_RESET_TOKEN_MESSAGE,
      });
    }

    if (user.status === "disabled") {
      return res.status(403).json({ message: "Benutzerkonto ist deaktiviert" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await user.save();

    return res.json({ message: "Passwort wurde zurueckgesetzt" });
  } catch (err) {
    console.error("Fehler bei resetPassword:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};
