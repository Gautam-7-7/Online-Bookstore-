const request = require("supertest");
const app = require("../src/app");

describe("API Health and Root endpoints", () => {
    test("GET / returns running status message", async () => {
        const response = await request(app).get("/");

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Online Bookstore API is running");
    });

    test("GET /api/health returns health diagnostics", async () => {
        const response = await request(app).get("/api/health");

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("healthy");
        expect(typeof response.body.uptime).toBe("number");
        expect(response.body.timestamp).toBeDefined();
    });
});
