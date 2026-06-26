process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.ENABLE_RATE_LIMIT_TESTS = "true";

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/user");
const { RATE_LIMIT_MESSAGE } = require("../middleware/rateLimiters");

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
    delete process.env.ENABLE_RATE_LIMIT_TESTS;
    await mongoose.connection.close();
});

describe("Auth Rate Limiting", () => {
    test("limits repeated login attempts", async () => {
        for (let index = 0; index < 20; index += 1) {
            const res = await request(app).post("/auth/login").send({
                email: `rate-limit-login-${index}@example.com`,
                password: "WrongPassword123!",
            });

            expect(res.statusCode).toBe(401);
        }

        const limitedRes = await request(app).post("/auth/login").send({
            email: "rate-limit-login-blocked@example.com",
            password: "WrongPassword123!",
        });

        expect(limitedRes.statusCode).toBe(429);
        expect(limitedRes.body.message).toBe(RATE_LIMIT_MESSAGE);
    });

    test("limits repeated forgot password requests", async () => {
        for (let index = 0; index < 5; index += 1) {
            const res = await request(app).post("/auth/forgot-password").send({
                email: `rate-limit-reset-${index}@example.com`,
            });

            expect(res.statusCode).toBe(200);
        }

        const limitedRes = await request(app).post("/auth/forgot-password").send({
            email: "rate-limit-reset-blocked@example.com",
        });

        expect(limitedRes.statusCode).toBe(429);
        expect(limitedRes.body.message).toBe(RATE_LIMIT_MESSAGE);
    });
});