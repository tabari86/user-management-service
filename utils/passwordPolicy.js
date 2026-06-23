// utils/passwordPolicy.js

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const PASSWORD_POLICY_MESSAGE =
    "newPassword must be 12-128 characters long and include uppercase, lowercase, number and special character";

function validatePasswordPolicy(password) {
    if (typeof password !== "string") {
        return {
            isValid: false,
            message: PASSWORD_POLICY_MESSAGE,
        };
    }

    const hasValidLength =
        password.length >= MIN_PASSWORD_LENGTH &&
        password.length <= MAX_PASSWORD_LENGTH;

    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    // Special character: any ASCII character that is not a letter, number or whitespace
    const hasSpecialCharacter = /[^\sA-Za-z0-9]/.test(password);

    if (
        !hasValidLength ||
        !hasLowercase ||
        !hasUppercase ||
        !hasNumber ||
        !hasSpecialCharacter
    ) {
        return {
            isValid: false,
            message: PASSWORD_POLICY_MESSAGE,
        };
    }

    return {
        isValid: true,
        message: null,
    };
}

module.exports = {
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_LENGTH,
    PASSWORD_POLICY_MESSAGE,
    validatePasswordPolicy,
};