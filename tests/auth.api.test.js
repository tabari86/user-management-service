process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES =
  process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || "15";

jest.mock("../services/emailService", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const crypto = require("crypto");
const app = require("../app");
const User = require("../models/user");
const { PASSWORD_POLICY_MESSAGE } = require("../utils/passwordPolicy");
const { sendPasswordResetEmail } = require("../services/emailService");

const PASSWORD_RESET_REQUEST_MESSAGE =
  "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zuruecksetzen des Passworts gesendet";
const INVALID_OR_EXPIRED_RESET_TOKEN_MESSAGE =
  "Ungueltiger oder abgelaufener Reset-Token";
const PASSWORD_RESET_SUCCESS_MESSAGE = "Passwort wurde zurueckgesetzt";
const TEST_PASSWORD = "TestPassword123!";

async function registerUser(overrides = {}) {
  const payload = {
    name: "Test User",
    email: "testuser@example.com",
    password: TEST_PASSWORD,
    ...overrides,
  };

  return request(app).post("/auth/register").send(payload);
}

async function loginUser(overrides = {}) {
  const payload = {
    email: "testuser@example.com",
    password: TEST_PASSWORD,
    ...overrides,
  };

  return request(app).post("/auth/login").send(payload);
}

async function createAuthenticatedUser(overrides = {}) {
  const userData = {
    name: "Authenticated User",
    email: "authuser@example.com",
    password: TEST_PASSWORD,
    ...overrides,
  };

  await registerUser(userData);

  const loginRes = await loginUser({
    email: userData.email,
    password: userData.password,
  });

  return {
    token: loginRes.body.token,
    user: loginRes.body.user,
  };
}

async function createPasswordResetToken(overrides = {}) {
  const userData = {
    name: "Password Reset User",
    email: "password-reset-user@example.com",
    password: TEST_PASSWORD,
    ...overrides,
  };

  await registerUser(userData);

  sendPasswordResetEmail.mockResolvedValueOnce({ messageId: "test-message" });

  const forgotPasswordRes = await request(app)
    .post("/auth/forgot-password")
    .send({
      email: userData.email,
    });

  const emailPayload = sendPasswordResetEmail.mock.calls[0][0];
  const resetToken = new URL(emailPayload.resetLink).searchParams.get("token");

  return {
    forgotPasswordRes,
    resetToken,
    email: userData.email,
    password: userData.password,
  };
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/user-management-test"
    );
  }
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Authentication API", () => {
  describe("POST /auth/register", () => {
    test("registers a new user without exposing passwordHash", async () => {
      const res = await registerUser({
        name: "Register User",
        email: "register@example.com",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.email).toBe("register@example.com");
      expect(res.body.name).toBe("Register User");
      expect(res.body.role).toBe("user");
      expect(res.body.status).toBe("active");
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.createdAt).toBeDefined();
    });

    test.each([
      ["email", { password: TEST_PASSWORD }],
      ["password", { email: "missing-password@example.com" }],
    ])("rejects registration without %s", async (_field, payload) => {
      const res = await request(app).post("/auth/register").send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    test("rejects duplicate email registration", async () => {
      await registerUser({
        email: "duplicate@example.com",
      });

      const res = await registerUser({
        email: "duplicate@example.com",
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toBeDefined();
    });

    test("rejects registration with a weak password", async () => {
      const res = await registerUser({
        email: "weak-register@example.com",
        password: "weakpassword123",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(PASSWORD_POLICY_MESSAGE);

      const user = await User.findOne({ email: "weak-register@example.com" });
      expect(user).toBeNull();
    });
  });

  describe("POST /auth/login", () => {
    test("logs in a user and returns a JWT token", async () => {
      await registerUser({
        name: "Login User",
        email: "login@example.com",
        password: TEST_PASSWORD,
      });

      const res = await loginUser({
        email: "login@example.com",
        password: TEST_PASSWORD,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("login@example.com");
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.status).toBe("active");
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test.each([
      ["email", { password: TEST_PASSWORD }],
      ["password", { email: "missing-login-password@example.com" }],
    ])("rejects login without %s", async (_field, payload) => {
      const res = await request(app).post("/auth/login").send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    test("rejects login for an unknown user", async () => {
      const res = await loginUser({
        email: "unknown@example.com",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    test("rejects login with a wrong password", async () => {
      await registerUser({
        email: "wrong-password@example.com",
        password: "CorrectPassword123!",
      });

      const res = await loginUser({
        email: "wrong-password@example.com",
        password: "wrong-password",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    test("rejects login for a disabled user", async () => {
      await registerUser({
        email: "disabled@example.com",
        password: TEST_PASSWORD,
      });

      await User.findOneAndUpdate(
        { email: "disabled@example.com" },
        { status: "disabled" }
      );

      const res = await loginUser({
        email: "disabled@example.com",
        password: TEST_PASSWORD,
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
      expect(res.body.token).toBeUndefined();
    });
  });

  describe("POST /auth/forgot-password", () => {
    test("rejects password reset request without email", async () => {
      const res = await request(app).post("/auth/forgot-password").send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("email ist erforderlich");
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test("returns a generic response for an unknown email", async () => {
      const res = await request(app).post("/auth/forgot-password").send({
        email: "unknown-reset@example.com",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(PASSWORD_RESET_REQUEST_MESSAGE);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test("rejects password reset request for a disabled user", async () => {
      await registerUser({
        email: "disabled-reset@example.com",
        password: TEST_PASSWORD,
      });

      await User.findOneAndUpdate(
        { email: "disabled-reset@example.com" },
        { status: "disabled" }
      );

      const res = await request(app).post("/auth/forgot-password").send({
        email: "disabled-reset@example.com",
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    test("creates a reset token hash and sends a reset email for an active user", async () => {
      await registerUser({
        email: "active-reset@example.com",
        password: TEST_PASSWORD,
      });

      sendPasswordResetEmail.mockResolvedValueOnce({ messageId: "test-message" });

      const beforeRequest = Date.now();

      const res = await request(app).post("/auth/forgot-password").send({
        email: "active-reset@example.com",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(PASSWORD_RESET_REQUEST_MESSAGE);
      expect(res.body.token).toBeUndefined();
      expect(res.body.resetToken).toBeUndefined();

      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

      const emailPayload = sendPasswordResetEmail.mock.calls[0][0];
      expect(emailPayload.to).toBe("active-reset@example.com");
      expect(emailPayload.resetLink).toContain(
        "http://localhost:3000/reset-password?token="
      );

      const resetToken = new URL(emailPayload.resetLink).searchParams.get("token");
      expect(resetToken).toBeDefined();

      const expectedTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const user = await User.findOne({ email: "active-reset@example.com" }).select(
        "+passwordResetTokenHash +passwordResetExpiresAt"
      );

      expect(user.passwordResetTokenHash).toBe(expectedTokenHash);
      expect(user.passwordResetExpiresAt).toBeInstanceOf(Date);

      const expiresAt = user.passwordResetExpiresAt.getTime();
      const minimumExpectedExpiry = beforeRequest + 14 * 60 * 1000;
      const maximumExpectedExpiry = beforeRequest + 16 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(minimumExpectedExpiry);
      expect(expiresAt).toBeLessThanOrEqual(maximumExpectedExpiry);
    });

    test("clears reset fields and returns 500 when email delivery fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      try {
        await registerUser({
          email: "email-failure-reset@example.com",
          password: TEST_PASSWORD,
        });

        sendPasswordResetEmail.mockRejectedValueOnce(new Error("SMTP failed"));

        const res = await request(app).post("/auth/forgot-password").send({
          email: "email-failure-reset@example.com",
        });

        expect(res.statusCode).toBe(500);
        expect(res.body.message).toBe("Interner Serverfehler");

        const user = await User.findOne({
          email: "email-failure-reset@example.com",
        }).select("+passwordResetTokenHash +passwordResetExpiresAt");

        expect(user.passwordResetTokenHash).toBeNull();
        expect(user.passwordResetExpiresAt).toBeNull();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe("POST /auth/reset-password", () => {
    test.each([
      ["token", { newPassword: "NewPassword123!" }],
      ["newPassword", { token: "some-reset-token" }],
    ])("rejects password reset without %s", async (_field, payload) => {
      const res = await request(app).post("/auth/reset-password").send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("token und newPassword sind erforderlich");
    });

    test("rejects password reset with a weak new password", async () => {
      const { resetToken } = await createPasswordResetToken({
        email: "weak-reset-password@example.com",
      });

      const res = await request(app).post("/auth/reset-password").send({
        token: resetToken,
        newPassword: "weakpassword123",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(PASSWORD_POLICY_MESSAGE);
    });

    test("rejects password reset with an invalid token", async () => {
      const res = await request(app).post("/auth/reset-password").send({
        token: "invalid-reset-token",
        newPassword: "NewPassword123!",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(INVALID_OR_EXPIRED_RESET_TOKEN_MESSAGE);
    });

    test("rejects password reset with an expired token", async () => {
      await registerUser({
        email: "expired-reset-token@example.com",
        password: TEST_PASSWORD,
      });

      const resetToken = "expired-reset-token";
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await User.findOneAndUpdate(
        { email: "expired-reset-token@example.com" },
        {
          passwordResetTokenHash: resetTokenHash,
          passwordResetExpiresAt: new Date(Date.now() - 60 * 1000),
        }
      );

      const res = await request(app).post("/auth/reset-password").send({
        token: resetToken,
        newPassword: "NewPassword123!",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(INVALID_OR_EXPIRED_RESET_TOKEN_MESSAGE);
    });

    test("rejects password reset for a disabled user", async () => {
      const { resetToken, email } = await createPasswordResetToken({
        email: "disabled-reset-password@example.com",
      });

      await User.findOneAndUpdate({ email }, { status: "disabled" });

      const res = await request(app).post("/auth/reset-password").send({
        token: resetToken,
        newPassword: "NewPassword123!",
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
    });

    test("resets password, clears reset fields and allows login with the new password", async () => {
      const { resetToken, email } = await createPasswordResetToken({
        email: "successful-reset-password@example.com",
      });

      const res = await request(app).post("/auth/reset-password").send({
        token: resetToken,
        newPassword: "NewPassword123!",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(PASSWORD_RESET_SUCCESS_MESSAGE);
      expect(res.body.passwordHash).toBeUndefined();

      const user = await User.findOne({ email }).select(
        "+passwordResetTokenHash +passwordResetExpiresAt"
      );

      expect(user.passwordResetTokenHash).toBeNull();
      expect(user.passwordResetExpiresAt).toBeNull();

      const oldLoginRes = await loginUser({
        email,
        password: TEST_PASSWORD,
      });

      expect(oldLoginRes.statusCode).toBe(401);

      const newLoginRes = await loginUser({
        email,
        password: "NewPassword123!",
      });

      expect(newLoginRes.statusCode).toBe(200);
      expect(newLoginRes.body.token).toBeDefined();

      const reuseRes = await request(app).post("/auth/reset-password").send({
        token: resetToken,
        newPassword: "AnotherPassword123!",
      });

      expect(reuseRes.statusCode).toBe(400);
      expect(reuseRes.body.message).toBe(INVALID_OR_EXPIRED_RESET_TOKEN_MESSAGE);
    });
  });
});

describe("User Profile API", () => {
  describe("GET /users/me", () => {
    test("rejects requests without token", async () => {
      const res = await request(app).get("/users/me");

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    test("rejects requests with invalid token", async () => {
      const res = await request(app)
        .get("/users/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    test("returns current user profile with valid token", async () => {
      const { token } = await createAuthenticatedUser({
        name: "Protected User",
        email: "protected@example.com",
      });

      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe("protected@example.com");
      expect(res.body.name).toBe("Protected User");
      expect(res.body.passwordHash).toBeUndefined();
    });

    test("returns 404 when token user no longer exists", async () => {
      const { token, user } = await createAuthenticatedUser({
        email: "deleted-token-user@example.com",
      });

      await User.findByIdAndDelete(user._id);

      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Benutzer nicht gefunden");
    });

    test("rejects profile access for a disabled user with an existing token", async () => {
      const { token, user } = await createAuthenticatedUser({
        email: "disabled-profile-access@example.com",
      });

      await User.findByIdAndUpdate(user._id, { status: "disabled" });

      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
    });
  });

  describe("PUT /users/me", () => {
    test("updates the current user's profile name", async () => {
      const { token } = await createAuthenticatedUser({
        email: "update@example.com",
      });

      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Updated User",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Profil aktualisiert");
      expect(res.body.user.email).toBe("update@example.com");
      expect(res.body.user.name).toBe("Updated User");
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test("trims the submitted profile name", async () => {
      const { token } = await createAuthenticatedUser({
        email: "trim@example.com",
      });

      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "  Trimmed User  ",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe("Trimmed User");
    });

    test("rejects profile update without token", async () => {
      const res = await request(app).put("/users/me").send({
        name: "Unauthorized Update",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    test("rejects profile update for a disabled user with an existing token", async () => {
      const { token, user } = await createAuthenticatedUser({
        email: "disabled-profile-update@example.com",
      });

      await User.findByIdAndUpdate(user._id, { status: "disabled" });

      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Blocked Update",
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
    });

    test.each([
      ["empty body", {}],
      ["blank name", { name: "   " }],
    ])("rejects profile update with %s", async (_caseName, payload) => {
      const { token } = await createAuthenticatedUser({
        email: "invalid-update@example.com",
      });

      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });
  });

  describe("PATCH /users/me/password", () => {
    test("rejects password change without token", async () => {
      const res = await request(app).patch("/users/me/password").send({
        currentPassword: TEST_PASSWORD,
        newPassword: "newPassword123",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBeDefined();
    });

    test.each([
      ["currentPassword", { newPassword: "newPassword123" }],
      ["newPassword", { currentPassword: TEST_PASSWORD }],
    ])("rejects password change without %s", async (_field, payload) => {
      const { token } = await createAuthenticatedUser({
        email: "missing-password-field@example.com",
      });

      const res = await request(app)
        .patch("/users/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(
        "currentPassword und newPassword sind erforderlich"
      );
    });

    test("rejects a weak new password", async () => {
      const { token } = await createAuthenticatedUser({
        email: "weak-password@example.com",
      });

      const res = await request(app)
        .patch("/users/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: "weakpassword123",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(PASSWORD_POLICY_MESSAGE);
    });

    test("rejects password change with wrong current password", async () => {
      const { token } = await createAuthenticatedUser({
        email: "wrong-current-password@example.com",
      });

      const res = await request(app)
        .patch("/users/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "wrong-password",
          newPassword: "NewPassword123!",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Aktuelles Passwort ist ungültig");
    });

    test("rejects password change for a disabled user", async () => {
      const { token, user } = await createAuthenticatedUser({
        email: "disabled-password-change@example.com",
      });

      await User.findByIdAndUpdate(user._id, { status: "disabled" });

      const res = await request(app)
        .patch("/users/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: "NewPassword123!",
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
    });

    test("updates password and requires the new password for future login", async () => {
      const email = "change-password@example.com";

      const { token } = await createAuthenticatedUser({
        email,
        password: "OldPassword123!",
      });

      const res = await request(app)
        .patch("/users/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "NewPassword123!",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Passwort aktualisiert");
      expect(res.body.passwordHash).toBeUndefined();

      const oldLoginRes = await loginUser({
        email,
        password: "OldPassword123!",
      });

      expect(oldLoginRes.statusCode).toBe(401);

      const newLoginRes = await loginUser({
        email,
        password: "NewPassword123!",
      });

      expect(newLoginRes.statusCode).toBe(200);
      expect(newLoginRes.body.token).toBeDefined();
    });
  });
});