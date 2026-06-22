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
        role: "user",
        ...overrides,
    };

    await registerUser({
        name: userData.name,
        email: userData.email,
        password: userData.password,
    });

    await User.findOneAndUpdate(
        { email: userData.email },
        { role: userData.role }
    );

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

describe("Admin User Management API", () => {
    describe("GET /users", () => {
        test("rejects requests without token", async () => {
            const res = await request(app).get("/users");

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBeDefined();
        });

        test("rejects requests from regular users", async () => {
            const { token } = await createAuthenticatedUser({
                email: "regular@example.com",
                role: "user",
            });

            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Zugriff verweigert");
        });
        test("rejects requests from a disabled admin with an existing token", async () => {
            const { token, user } = await createAuthenticatedUser({
                email: "disabled-admin-list@example.com",
                role: "admin",
            });

            await User.findByIdAndUpdate(user._id, { status: "disabled" });

            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
        });

        test("uses the current user role from the database instead of the token payload", async () => {
            const { token, user } = await createAuthenticatedUser({
                email: "downgraded-admin@example.com",
                role: "admin",
            });

            await User.findByIdAndUpdate(user._id, { role: "user" });

            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Zugriff verweigert");
        });

        test("allows admins to list users without exposing passwordHash", async () => {
            const { token } = await createAuthenticatedUser({
                name: "Admin User",
                email: "admin@example.com",
                role: "admin",
            });

            await registerUser({
                name: "Regular User",
                email: "regular@example.com",
            });

            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.users)).toBe(true);
            expect(res.body.users).toHaveLength(2);

            const emails = res.body.users.map((user) => user.email);
            expect(emails).toContain("admin@example.com");
            expect(emails).toContain("regular@example.com");

            for (const user of res.body.users) {
                expect(user.passwordHash).toBeUndefined();
                expect(user.email).toBeDefined();
                expect(user.role).toBeDefined();
                expect(user.status).toBeDefined();
            }
        });
    });
    describe("PATCH /users/:id/status", () => {
        test("rejects requests without token", async () => {
            const targetUser = await User.create({
                name: "Target User",
                email: "target@example.com",
                passwordHash: "hashed-password",
            });

            const res = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .send({ status: "disabled" });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBeDefined();
        });

        test("rejects requests from regular users", async () => {
            const { token } = await createAuthenticatedUser({
                email: "regular-status@example.com",
                role: "user",
            });

            const targetUser = await User.create({
                name: "Target User",
                email: "target-status@example.com",
                passwordHash: "hashed-password",
            });

            const res = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "disabled" });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Zugriff verweigert");
        });

        test("rejects status changes from a disabled admin with an existing token", async () => {
            const { token, user: admin } = await createAuthenticatedUser({
                email: "disabled-admin-status@example.com",
                role: "admin",
            });

            const targetUser = await User.create({
                name: "Target User",
                email: "target-disabled-admin-status@example.com",
                passwordHash: "hashed-password",
            });

            await User.findByIdAndUpdate(admin._id, { status: "disabled" });

            const res = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "disabled" });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Benutzerkonto ist deaktiviert");
        });

        test("rejects invalid account status", async () => {
            const { token } = await createAuthenticatedUser({
                email: "admin-invalid-status@example.com",
                role: "admin",
            });

            const targetUser = await User.create({
                name: "Target User",
                email: "target-invalid-status@example.com",
                passwordHash: "hashed-password",
            });

            const res = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "locked" });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("status muss active oder disabled sein");
        });

        test("returns 404 when the target user does not exist", async () => {
            const { token } = await createAuthenticatedUser({
                email: "admin-missing-target@example.com",
                role: "admin",
            });

            const missingUserId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .patch(`/users/${missingUserId}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "disabled" });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Benutzer nicht gefunden");
        });

        test("allows admins to disable a user and stores status metadata", async () => {
            const { token, user: admin } = await createAuthenticatedUser({
                email: "admin-disable@example.com",
                role: "admin",
            });

            const targetUser = await User.create({
                name: "User To Disable",
                email: "disable-target@example.com",
                passwordHash: "hashed-password",
            });

            const res = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "disabled" });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Benutzerstatus aktualisiert");
            expect(res.body.user.status).toBe("disabled");
            expect(res.body.user.disabledAt).toBeDefined();
            expect(res.body.user.statusChangedAt).toBeDefined();
            expect(res.body.user.statusChangedBy).toBe(admin._id);
            expect(res.body.user.passwordHash).toBeUndefined();
        });

        test("allows admins to reactivate a disabled user and stores activation metadata", async () => {
            const { token, user: admin } = await createAuthenticatedUser({
                email: "admin-reactivate@example.com",
                role: "admin",
            });

            const targetUser = await User.create({
                name: "User To Reactivate",
                email: "reactivate-target@example.com",
                passwordHash: "hashed-password",
                status: "disabled",
                disabledAt: new Date(),
            });

            const res = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "active" });

            expect(res.statusCode).toBe(200);
            expect(res.body.user.status).toBe("active");
            expect(res.body.user.activatedAt).toBeDefined();
            expect(res.body.user.statusChangedAt).toBeDefined();
            expect(res.body.user.statusChangedBy).toBe(admin._id);
            expect(res.body.user.passwordHash).toBeUndefined();
        });
        test("prevents login after an admin disables a user", async () => {
            const { token } = await createAuthenticatedUser({
                email: "admin-disable-login@example.com",
                role: "admin",
            });

            await registerUser({
                name: "User Disabled By Admin",
                email: "disabled-by-admin@example.com",
                password: "test123456",
            });

            const targetUser = await User.findOne({
                email: "disabled-by-admin@example.com",
            });

            const statusRes = await request(app)
                .patch(`/users/${targetUser._id}/status`)
                .set("Authorization", `Bearer ${token}`)
                .send({ status: "disabled" });

            expect(statusRes.statusCode).toBe(200);
            expect(statusRes.body.user.status).toBe("disabled");

            const loginRes = await loginUser({
                email: "disabled-by-admin@example.com",
                password: "test123456",
            });

            expect(loginRes.statusCode).toBe(403);
            expect(loginRes.body.message).toBe("Benutzerkonto ist deaktiviert");
            expect(loginRes.body.token).toBeUndefined();
        });
    });
});