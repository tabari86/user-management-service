const request = require("supertest");
const app = require("../app");

describe("Health Check", () => {
  test("GET /health returns service status", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      service: "user-management-service",
    });
  });

  test("GET / returns a basic API message", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("User Management Service API");
  });
});