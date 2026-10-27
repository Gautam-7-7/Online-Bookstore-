require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Book = require("../src/models/Book");
const User = require("../src/models/User");

// Integration tests for the catalogue API. They talk to the real database
// via MONGODB_URI, matching the existing auth integration test. Each test
// cleans up the data it creates.
//
// Run with MongoDB available:  npm test

const testIsbn = `97800000${Date.now().toString().slice(-5)}`;
const fixtureIsbns = [
    "9780000000001",
    "9780000000002",
    "9780000000003",
    "9780000000004"
];
let createdBookId;
const sellerName = "Book Seller Integration";
const sellerEmail = `seller${Date.now()}@example.com`;
let sellerToken;

describe("Catalogue API Integration Tests", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
        await request(app).post("/api/auth/register").send({
            name: sellerName,
            email: sellerEmail,
            password: "Test@12345"
        });
        const loginResponse = await request(app).post("/api/auth/login").send({
            email: sellerEmail,
            password: "Test@12345"
        });
        sellerToken = loginResponse.body.token;
        await Book.create([
            {
                title: "Cheap Available Book",
                author: "Filter Tester",
                isbn: fixtureIsbns[0],
                category: "Testing",
                price: 50,
                stock: 4,
                rating: 3
            },
            {
                title: "Expensive Available Book",
                author: "Filter Tester",
                isbn: fixtureIsbns[1],
                category: "Testing",
                price: 300,
                stock: 2,
                rating: 5
            },
            {
                title: "Unavailable Book",
                author: "Filter Tester",
                isbn: fixtureIsbns[2],
                category: "Testing",
                price: 150,
                stock: 0,
                rating: 4
            },
            {
                title: "Inactive Book",
                author: "Filter Tester",
                isbn: fixtureIsbns[3],
                category: "Testing",
                price: 25,
                stock: 2,
                isActive: false
            }
        ]);
    });

    afterAll(async () => {
        await Book.deleteMany({ isbn: { $in: [testIsbn, ...fixtureIsbns] } });
        await User.deleteOne({ email: sellerEmail });
        await mongoose.connection.close();
    });

    test("POST /api/books rejects unauthenticated requests", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Unauthenticated",
                author: "Tester",
                isbn: testIsbn,
                category: "Testing",
                price: 199
            });

        expect(response.statusCode).toBe(401);
    });

    test("POST /api/books creates a book", async () => {
        const response = await request(app)
            .post("/api/books")
            .set("Authorization", `Bearer ${sellerToken}`)
            .send({
                title: "Integration Test Book",
                author: "Tester",
                isbn: testIsbn,
                category: "Testing",
                price: 199,
                condition: "New",
                seller: "Client Supplied Seller",
                stock: 3
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Book created successfully");
        expect(response.body.book.title).toBe("Integration Test Book");
        expect(response.body.book.seller).toBe(sellerName);

        createdBookId = response.body.book._id;
    });

    test("POST /api/books rejects missing required fields", async () => {
        const response = await request(app)
            .post("/api/books")
            .set("Authorization", `Bearer ${sellerToken}`)
            .send({ title: "No author or isbn" });

        expect(response.statusCode).toBe(400);
    });

    test("POST /api/books rejects a duplicate ISBN", async () => {
        const response = await request(app)
            .post("/api/books")
            .set("Authorization", `Bearer ${sellerToken}`)
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

    test("GET /api/books filters by category, price range, and availability", async () => {
        const response = await request(app)
            .get("/api/books")
            .query({
                category: "testing",
                minPrice: 40,
                maxPrice: 100,
                availability: "in_stock"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.books.map((book) => book.title)).toEqual([
            "Cheap Available Book"
        ]);

        const unavailable = await request(app)
            .get("/api/books")
            .query({ availability: "out_of_stock" });

        expect(unavailable.statusCode).toBe(200);
        expect(unavailable.body.books.map((book) => book.title)).toEqual([
            "Unavailable Book"
        ]);
    });

    test("GET /api/books sorts by price and rating", async () => {
        const byPrice = await request(app)
            .get("/api/books")
            .query({ search: "Filter Tester", sort: "price_asc" });
        const byRating = await request(app)
            .get("/api/books")
            .query({ search: "Filter Tester", sort: "rating_desc" });

        expect(byPrice.statusCode).toBe(200);
        expect(byPrice.body.books.map((book) => book.price)).toEqual([
            50, 150, 300
        ]);
        expect(byRating.statusCode).toBe(200);
        expect(byRating.body.books.map((book) => book.rating)).toEqual([
            5, 4, 3
        ]);
    });

    test("GET /api/books filters out inactive books", async () => {
        const response = await request(app)
            .get("/api/books")
            .query({ search: "Inactive Book" });

        expect(response.statusCode).toBe(200);
        expect(response.body.books).toHaveLength(0);
    });

    test("GET /api/books rejects invalid ranges, pagination, and availability", async () => {
        const invalidQueries = [
            { minPrice: 100, maxPrice: 10 },
            { minPrice: -1 },
            { page: 0 },
            { limit: "not-a-number" },
            { availability: "unknown" },
            { sort: "unknown" }
        ];

        for (const query of invalidQueries) {
            const response = await request(app).get("/api/books").query(query);
            expect(response.statusCode).toBe(400);
        }
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

    test("GET /api/books/:id does not expose inactive books", async () => {
        const inactiveBook = await Book.findOne({ isbn: fixtureIsbns[3] });
        const response = await request(app).get(`/api/books/${inactiveBook._id}`);

        expect(response.statusCode).toBe(404);
    });
});
