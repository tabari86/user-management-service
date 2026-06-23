// services/emailService.js
const nodemailer = require("nodemailer");

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 2525),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

async function sendPasswordResetEmail({ to, resetLink }) {
    const transporter = createTransporter();
    const expiryMinutes = process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || 15;

    return transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: "Password reset request",
        text: [
            "You requested a password reset for your account.",
            "",
            "Use the following link to reset your password:",
            resetLink,
            "",
            `This link expires in ${expiryMinutes} minutes.`,
            "",
            "If you did not request this, you can ignore this email.",
        ].join("\n"),
    });
}

module.exports = {
    sendPasswordResetEmail,
};