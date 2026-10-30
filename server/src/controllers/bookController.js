const mongoose = require("mongoose");
const Book = require("../models/Book");
const Order = require("../models/Order");
const SellerRating = require("../models/SellerRating");

const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "rating_desc"];
const AVAILABILITY_OPTIONS = ["in_stock", "out_of_stock"];

const parseNonNegativeNumber = (value) => {
    if (value === undefined) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parsePositiveInteger = (value, defaultValue, maximum) => {
    if (value === undefined) {
        return defaultValue;
    }

    if (!/^\d+$/.test(String(value))) {
        return null;
    }

    const parsed = Number(value);
    return parsed >= 1 && parsed <= maximum ? parsed : null;
};

const escapeRegex = (value) =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeIsbn = (value) =>
    typeof value === "string" ? value.replace(/[\s-]/g, "").toUpperCase() : value;

const isDuplicateKeyError = (error) => error?.code === 11000;

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

        const normalizedIsbn = normalizeIsbn(isbn);
        const existingBook = await Book.findOne({ isbn: normalizedIsbn });

        if (existingBook) {
            return res.status(409).json({
                message: "Duplicate ISBN detected; this book is already listed",
                duplicate: true,
                duplicateBookId: existingBook._id
            });
        }

        const book = await Book.create({
            title,
            author,
            isbn: normalizedIsbn,
            category,
            price,
            condition,
            seller: req.user.name,
            sellerId: req.user.id,
            coverImage,
            stock,
            description
        });

        return res.status(201).json({
            message: "Book created successfully",
            book
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({
                message: "Duplicate ISBN detected; this book is already listed",
                duplicate: true
            });
        }
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

const getSellerBooks = async (req, res) => {
    try {
        const books = await Book.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ books });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve your listings" });
    }
};

const getSellerBook = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid book ID" });
        }
        const book = await Book.findOne({
            _id: id.toLowerCase(),
            sellerId: req.user.id
        });
        if (!book) {
            return res.status(404).json({ message: "Listing not found" });
        }
        return res.status(200).json({ book });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve listing" });
    }
};

const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid book ID" });
        }

        const allowedFields = [
            "title",
            "author",
            "isbn",
            "category",
            "price",
            "condition",
            "coverImage",
            "stock",
            "description"
        ];
        const body = req.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({ message: "Listing fields are required" });
        }
        const updates = { ...body };
        const suppliedFields = Object.keys(updates);
        if (
            !suppliedFields.length ||
            suppliedFields.some((field) => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                message: "Only listing details can be edited"
            });
        }

        const book = await Book.findOne({
            _id: id.toLowerCase(),
            sellerId: req.user.id,
            isActive: true
        });
        if (!book) {
            return res.status(404).json({ message: "Active listing not found" });
        }

        if (updates.isbn !== undefined) {
            const isbn = normalizeIsbn(updates.isbn);
            const duplicate = await Book.findOne({
                isbn,
                _id: { $ne: book._id }
            });
            if (duplicate) {
                return res.status(409).json({
                    message: "Duplicate ISBN detected; this book is already listed",
                    duplicate: true,
                    duplicateBookId: duplicate._id
                });
            }
            updates.isbn = isbn;
        }

        for (const field of suppliedFields) {
            book[field] = updates[field];
        }
        await book.save();
        return res.status(200).json({ message: "Listing updated", book });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({
                message: "Duplicate ISBN detected; this book is already listed",
                duplicate: true
            });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Validation failed",
                error: error.message
            });
        }
        return res.status(500).json({ message: "Failed to update listing" });
    }
};

const removeBook = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid book ID" });
        }
        const book = await Book.findOneAndUpdate(
            {
                _id: id.toLowerCase(),
                sellerId: req.user.id,
                isActive: true
            },
            { $set: { isActive: false } },
            { new: true, runValidators: true }
        );
        if (!book) {
            return res.status(404).json({ message: "Active listing not found" });
        }
        return res.status(200).json({ message: "Listing removed", book });
    } catch (error) {
        return res.status(500).json({ message: "Failed to remove listing" });
    }
};

const getSellerDashboard = async (req, res) => {
    try {
        const sellerId = new mongoose.Types.ObjectId(req.user.id);
        const [listingStats, salesStats, rating] = await Promise.all([
            Book.aggregate([
                { $match: { sellerId } },
                {
                    $group: {
                        _id: null,
                        totalListings: { $sum: 1 },
                        activeListings: {
                            $sum: { $cond: ["$isActive", 1, 0] }
                        },
                        totalStock: { $sum: "$stock" }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        "payment.status": "succeeded",
                        status: {
                            $in: ["Placed", "Shipped", "Out for Delivery", "Delivered"]
                        }
                    }
                },
                { $unwind: "$items" },
                { $match: { "items.sellerId": sellerId } },
                {
                    $group: {
                        _id: "$_id",
                        unitsSold: { $sum: "$items.quantity" },
                        grossSales: {
                            $sum: {
                                $multiply: ["$items.unitPrice", "$items.quantity"]
                            }
                        },
                        orderSubtotal: { $first: "$subtotal" },
                        orderDiscount: { $first: "$discount" }
                    }
                },
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        unitsSold: { $sum: "$unitsSold" },
                        revenue: {
                            $sum: {
                                $subtract: [
                                    "$grossSales",
                                    {
                                        $cond: [
                                            { $gt: ["$orderSubtotal", 0] },
                                            {
                                                $multiply: [
                                                    "$grossSales",
                                                    {
                                                        $divide: [
                                                            "$orderDiscount",
                                                            "$orderSubtotal"
                                                        ]
                                                    }
                                                ]
                                            },
                                            0
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        orders: 1,
                        unitsSold: 1,
                        revenue: { $round: ["$revenue", 2] }
                    }
                }
            ]),
            SellerRating.findOne({ seller: req.user.name }).select(
                "averageRating reviewCount"
            )
        ]);

        return res.status(200).json({
            seller: req.user.name,
            listings: listingStats[0] || {
                totalListings: 0,
                activeListings: 0,
                totalStock: 0
            },
            sales: salesStats[0] || {
                orders: 0,
                unitsSold: 0,
                revenue: 0
            },
            rating: {
                averageRating: rating?.averageRating || 0,
                reviewCount: rating?.reviewCount || 0
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to load seller dashboard" });
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
            const regex = new RegExp(escapeRegex(search), "i");
            query.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
        }

        if (category) {
            query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
        }

        const parsedMinPrice = parseNonNegativeNumber(minPrice);
        const parsedMaxPrice = parseNonNegativeNumber(maxPrice);
        const pageNumber = parsePositiveInteger(page, 1, 1000000);
        const pageSize = parsePositiveInteger(limit, 12, 100);

        if (
            parsedMinPrice === null ||
            parsedMaxPrice === null ||
            pageNumber === null ||
            pageSize === null ||
            (parsedMinPrice !== undefined &&
                parsedMaxPrice !== undefined &&
                parsedMinPrice > parsedMaxPrice)
        ) {
            return res.status(400).json({
                message:
                    "Invalid price range or pagination. Prices must be non-negative with minPrice <= maxPrice; page and limit must be positive integers."
            });
        }

        if (sort !== undefined && !SORT_OPTIONS.includes(sort)) {
            return res.status(400).json({
                message: "Invalid sort option"
            });
        }

        if (
            req.query.availability !== undefined &&
            !AVAILABILITY_OPTIONS.includes(req.query.availability)
        ) {
            return res.status(400).json({
                message: "Invalid availability option"
            });
        }

        // Price range filter.
        if (parsedMinPrice !== undefined || parsedMaxPrice !== undefined) {
            query.price = {};
            if (parsedMinPrice !== undefined) {
                query.price.$gte = parsedMinPrice;
            }
            if (parsedMaxPrice !== undefined) {
                query.price.$lte = parsedMaxPrice;
            }
        }

        if (req.query.availability === "in_stock") {
            query.stock = { $gt: 0 };
        } else if (req.query.availability === "out_of_stock") {
            query.stock = 0;
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

            const book = await Book.findOne({ _id: id, isActive: true });

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
    getSellerBook,
    getSellerBooks,
    getSellerDashboard,
    getBooks,
    getBookById,
    removeBook,
    updateBook
};
