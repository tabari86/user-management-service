const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/user");

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";

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
  test("registers a new user", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Test User",
      email: "testuser@example.com",
      password: "test123456",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.email).toBe("testuser@example.com");
    expect(res.body.role).toBe("user");
    expect(res.body.passwordHash).toBeUndefined();
  });

  test("logs in a user and returns a JWT token", async () => {
    await request(app).post("/auth/register").send({
      name: "Login User",
      email: "login@example.com",
      password: "test123456",
    });

    const res = await request(app).post("/auth/login").send({
      email: "login@example.com",
      password: "test123456",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("login@example.com");
  });

  test("returns current user profile with valid token", async () => {
    await request(app).post("/auth/register").send({
      name: "Protected User",
      email: "protected@example.com",
      password: "test123456",
    });

    const loginRes = await request(app).post("/auth/login").send({
      email: "protected@example.com",
      password: "test123456",
    });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe("protected@example.com");
    expect(res.body.passwordHash).toBeUndefined();
  });
});