const request = require("supertest");
const app = require("../src/app");

describe("Book route wiring", () => {
    test("GET /api/books/:id reaches book router", async () => {
        const response = await request(app).get("/api/books/not-a-valid-id");

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Invalid book ID");
    });
});
