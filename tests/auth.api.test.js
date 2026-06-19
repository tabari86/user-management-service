process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/user");

async function registerUser(overrides = {}) {
  const payload = {
    name: "Test User",
    email: "testuser@example.com",
    password: "test123456",
    ...overrides,
  };

  return request(app).post("/auth/register").send(payload);
}

async function loginUser(overrides = {}) {
  const payload = {
    email: "testuser@example.com",
    password: "test123456",
    ...overrides,
  };

  return request(app).post("/auth/login").send(payload);
}

async function createAuthenticatedUser(overrides = {}) {
  const userData = {
    name: "Authenticated User",
    email: "authuser@example.com",
    password: "test123456",
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

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://127.0.0.1:27017/user-management-test"
    );
  }
});

afterEach(async () => {
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
      ["email", { password: "test123456" }],
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
  });

  describe("POST /auth/login", () => {
    test("logs in a user and returns a JWT token", async () => {
      await registerUser({
        name: "Login User",
        email: "login@example.com",
        password: "test123456",
      });

      const res = await loginUser({
        email: "login@example.com",
        password: "test123456",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("login@example.com");
      expect(res.body.user.role).toBe("user");
      expect(res.body.user.status).toBe("active");
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test.each([
      ["email", { password: "test123456" }],
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
        password: "correct-password",
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
    password: "test123456",
  });

  await User.findOneAndUpdate(
    { email: "disabled@example.com" },
    { status: "disabled" }
  );

  const res = await loginUser({
    email: "disabled@example.com",
    password: "test123456",
  });

  expect(res.statusCode).toBe(403);
  expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
  expect(res.body.token).toBeUndefined();
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
});