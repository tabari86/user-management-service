// middleware/rateLimiters.js

const { rateLimit } = require("express-rate-limit");

const RATE_LIMIT_MESSAGE =
    "Zu viele Anfragen. Bitte versuchen Sie es spaeter erneut.";

const shouldSkipRateLimit = () =>
    process.env.NODE_ENV === "test" &&
    process.env.ENABLE_RATE_LIMIT_TESTS !== "true";

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
    message: {
        message: RATE_LIMIT_MESSAGE,
    },
});

const passwordResetRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
    message: {
        message: RATE_LIMIT_MESSAGE,
    },
});

module.exports = {
    authRateLimiter,
    passwordResetRateLimiter,
    RATE_LIMIT_MESSAGE,
};