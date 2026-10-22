const mongoose = require("mongoose");
const Book = require("../models/Book");

// POST /api/books  -> create a book (BOOK: "add book" API)
const createBook = async (req, res) => {
    try {
        const {
            title,
            author,
            isbn,
            category,
            price,
            condition,
            seller,
            coverImage,
            stock,
            description
        } = req.body;

        // Required-field validation, mirroring the auth controller's style.
        if (!title || !author || !isbn || !category || price === undefined) {
            return res.status(400).json({
                message:
                    "title, author, isbn, category and price are required"
            });
        }

        const existingBook = await Book.findOne({ isbn });

        if (existingBook) {
            return res.status(409).json({
                message: "A book with this ISBN already exists"
            });
        }

        const book = await Book.create({
            title,
            author,
            isbn,
            category,
            price,
            condition,
            seller,
            coverImage,
            stock,
            description
        });

        return res.status(201).json({
            message: "Book created successfully",
            book
        });
    } catch (error) {
        // Mongoose validation errors (bad ISBN, negative price, bad
        // condition) are client errors, not server errors.
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Validation failed",
                error: error.message
            });
        }

        return res.status(500).json({
            message: "Failed to create book",
            error: error.message
        });
    }
};

// GET /api/books -> list books with optional search, filter, sort, pagination
//   ?search=   keyword across title, author, isbn            (BOOK-F-006)
//   ?category= browse by category/genre                      (BOOK-F-005)
//   ?minPrice= &maxPrice=  price filter                      (BOOK-F-008)
//   ?sort=     price_asc | price_desc | rating_desc | newest (BOOK-F-008)
//   ?page= &limit=  pagination                               (BOOK-F-006)
const getBooks = async (req, res) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 12
        } = req.query;

        // Only active books are shown in the public catalogue.
        const query = { isActive: true };

        // Keyword search across title, author and ISBN (case-insensitive).
        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
        }

        if (category) {
            query.category = new RegExp(`^${category}$`, "i");
        }

        // Price range filter.
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined) {
                query.price.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined) {
                query.price.$lte = Number(maxPrice);
            }
        }

        // Sorting options.
        let sortOption = { createdAt: -1 };
        if (sort === "price_asc") {
            sortOption = { price: 1 };
        } else if (sort === "price_desc") {
            sortOption = { price: -1 };
        } else if (sort === "rating_desc") {
            sortOption = { rating: -1 };
        } else if (sort === "newest") {
            sortOption = { createdAt: -1 };
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const pageSize = Math.max(Number(limit) || 12, 1);
        const skip = (pageNumber - 1) * pageSize;

        const [books, totalBooks] = await Promise.all([
            Book.find(query).sort(sortOption).skip(skip).limit(pageSize),
            Book.countDocuments(query)
        ]);

        return res.status(200).json({
            books,
            page: pageNumber,
            totalPages: Math.ceil(totalBooks / pageSize) || 1,
            totalBooks
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to retrieve books",
            error: error.message
        });
    }
};

// GET /api/books/:id -> single book detail page (BOOK-F-007)
const getBookById = async (req, res) => {
    try {
        const { id } = req.params;

            // Reject malformed IDs before hitting the database.
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    message: "Invalid book ID"
                });
            }

            const book = await Book.findById(id);

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        return res.status(200).json({ book });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to retrieve book",
            error: error.message
        });
    }
};

module.exports = {
    createBook,
    getBooks,
    getBookById
};
