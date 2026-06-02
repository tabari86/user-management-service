const request = require("supertest");
const app = require("../app");

describe("Health Check", () => {
  test("GET / should return status 200", async () => {
    const res = await request(app).get("/");

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("User Management Service API läuft");
  });
});