require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const Book = require("../src/models/Book");

const testIsbn = "9780132350884";
const testIsbnSecond = "9780134685991";

describe("Catalogue API Integration Tests", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
        // Clean up any existing test records
        await Book.deleteMany({ isbn: { $in: [testIsbn, testIsbnSecond] } });
    });

    afterAll(async () => {
        await Book.deleteMany({ isbn: { $in: [testIsbn, testIsbnSecond] } });
        await mongoose.connection.close();
    });

    test("should create a new book successfully", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Clean Code",
                author: "Robert C. Martin",
                isbn: testIsbn,
                category: "Programming",
                price: 540,
                condition: "New",
                stock: 10,
                description: "A handbook of agile software craftsmanship"
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("Book created successfully");
        expect(response.body.book).toBeDefined();
        expect(response.body.book.isbn).toBe(testIsbn);
    });

    test("should reject duplicate ISBN creation with 409 Conflict", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Duplicate Clean Code",
                author: "Robert C. Martin",
                isbn: testIsbn,
                category: "Programming",
                price: 500
            });

        expect(response.statusCode).toBe(409);
        expect(response.body.message).toBe("A book with this ISBN already exists");
    });

    test("should fail book creation when required fields are missing", async () => {
        const response = await request(app)
            .post("/api/books")
            .send({
                title: "Incomplete Book"
                // missing author, isbn, category, price
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("title, author, isbn, category and price are required");
    });

    test("should retrieve books list with pagination and filters", async () => {
        // Create a second book for filtering/search testing
        await request(app)
            .post("/api/books")
            .send({
                title: "Node.js Design Patterns",
                author: "Mario Casciaro",
                isbn: testIsbnSecond,
                category: "Backend",
                price: 750,
                condition: "Good"
            });

        // Test general get books
        const listResponse = await request(app).get("/api/books");
        expect(listResponse.statusCode).toBe(200);
        expect(listResponse.body.books).toBeInstanceOf(Array);
        expect(listResponse.body.totalBooks).toBeGreaterThanOrEqual(2);

        // Test category filter
        const categoryResponse = await request(app).get("/api/books?category=Backend");
        expect(categoryResponse.statusCode).toBe(200);
        expect(categoryResponse.body.books.length).toBe(1);
        expect(categoryResponse.body.books[0].title).toBe("Node.js Design Patterns");

        // Test keyword search
        const searchResponse = await request(app).get("/api/books?search=Clean Code");
        expect(searchResponse.statusCode).toBe(200);
        expect(searchResponse.body.books.length).toBe(1);
        expect(searchResponse.body.books[0].isbn).toBe(testIsbn);
    });

    test("should retrieve a single book by valid ID", async () => {
        const createdBook = await Book.findOne({ isbn: testIsbn });

        const response = await request(app).get(`/api/books/${createdBook._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.book).toBeDefined();
        expect(response.body.book.title).toBe("Clean Code");
    });

    test("should return 400 for malformed book ID", async () => {
        const response = await request(app).get("/api/books/invalid-object-id");
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Invalid book ID");
    });

    test("should return 404 for non-existent book ID", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app).get(`/api/books/${fakeId}`);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe("Book not found");
    });
});