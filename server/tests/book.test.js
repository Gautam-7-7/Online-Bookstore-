const Book = require("../src/models/Book");

// Pure unit tests for the Book model's validation rules.
// These use Mongoose's validateSync() and do NOT need a database connection.

describe("Book model validation", () => {
    test("a fully valid book passes validation", () => {
        const book = new Book({
            title: "Clean Code",
            author: "Robert C. Martin",
            isbn: "9780132350884",
            category: "Programming",
            price: 540,
            condition: "New"
        });

        const error = book.validateSync();

        expect(error).toBeUndefined();
    });

    test("missing required fields fails validation", () => {
        const book = new Book({ title: "No Author Or ISBN" });

        const error = book.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.author).toBeDefined();
        expect(error.errors.isbn).toBeDefined();
        expect(error.errors.category).toBeDefined();
        expect(error.errors.price).toBeDefined();
    });

    test("an invalid ISBN fails validation", () => {
        const book = new Book({
            title: "Bad ISBN",
            author: "Someone",
            isbn: "12345",
            category: "Fiction",
            price: 100
        });

        const error = book.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.isbn).toBeDefined();
    });

    test("a negative price fails validation", () => {
        const book = new Book({
            title: "Negative Price",
            author: "Someone",
            isbn: "9780099590088",
            category: "Fiction",
            price: -10
        });

        const error = book.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.price).toBeDefined();
    });

    test("an invalid condition fails validation", () => {
        const book = new Book({
            title: "Bad Condition",
            author: "Someone",
            isbn: "9780099590088",
            category: "Fiction",
            price: 100,
            condition: "Brand New"
        });

        const error = book.validateSync();

        expect(error).toBeDefined();
        expect(error.errors.condition).toBeDefined();
    });

    test("condition defaults to 'Good' when omitted", () => {
        const book = new Book({
            title: "Default Condition",
            author: "Someone",
            isbn: "9780099590088",
            category: "Fiction",
            price: 100
        });

        expect(book.condition).toBe("Good");
        expect(book.isActive).toBe(true);
    });
});
