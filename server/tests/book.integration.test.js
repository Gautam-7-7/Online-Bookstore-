require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Book = require("../src/models/Book");

// Integration tests for the catalogue API. They talk to the real database
// via MONGODB_URI, matching the existing auth integration test. Each test
// cleans up the data it creates.
//
// Run with MongoDB available:  npm test

const testIsbn = `97800000${Date.now().toString().slice(-5)}`;
let createdBookId;

describe("Catalogue API Integration Tests", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
    });

    afterAll(async () => {
        await Book.deleteMany({ isbn: { $regex: "^97800000" } });
        await mongoose.connection.close();
    });

    test("POST /api/books creates a book", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Integration Test Book",
                author: "Tester",
                isbn: testIsbn,
                category: "Testing",
                price: 199,
                condition: "New",
                stock: 3
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Book created successfully");
        expect(response.body.book.title).toBe("Integration Test Book");

        createdBookId = response.body.book._id;
    });

    test("POST /api/books rejects missing required fields", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({ title: "No author or isbn" });

        expect(response.statusCode).toBe(400);
    });

    test("POST /api/books rejects a duplicate ISBN", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Duplicate",
                author: "Tester",
                isbn: testIsbn,
                category: "Testing",
                price: 199
            });

        expect(response.statusCode).toBe(409);
    });

    test("GET /api/books returns a paginated list", async () => {
        const response = await request(app).get("/api/books");

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.books)).toBe(true);
        expect(response.body).toHaveProperty("totalBooks");
        expect(response.body).toHaveProperty("totalPages");
    });

    test("GET /api/books?search= finds the book by title", async () => {
        const response = await request(app)
            .get("/api/books")
            .query({ search: "Integration Test Book" });

        expect(response.statusCode).toBe(200);
        const titles = response.body.books.map((b) => b.title);
        expect(titles).toContain("Integration Test Book");
    });

    test("GET /api/books?search= for a nonexistent book returns empty", async () => {
        const response = await request(app)
            .get("/api/books")
            .query({ search: "ThisBookDoesNotExist_ZZZ" });

        expect(response.statusCode).toBe(200);
        expect(response.body.books.length).toBe(0);
    });

    test("GET /api/books/:id returns a single book", async () => {
        const response = await request(app).get(`/api/books/${createdBookId}`);

        expect(response.statusCode).toBe(200);
        expect(response.body.book._id).toBe(createdBookId);
    });

    test("GET /api/books/:id with a malformed ID returns 400", async () => {
        const response = await request(app).get("/api/books/not-a-valid-id");

        expect(response.statusCode).toBe(400);
    });

    test("GET /api/books/:id with a nonexistent ID returns 404", async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await request(app).get(`/api/books/${fakeId}`);

        expect(response.statusCode).toBe(404);
    });
});
