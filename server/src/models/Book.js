const mongoose = require("mongoose");

// Allowed condition values for a book listing (SRS: BOOK-F-007 / BOOK-F-009).
const BOOK_CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];

// Lightweight ISBN-10 / ISBN-13 check. Hyphens and spaces are allowed and
// stripped before validation so "978-0-13-468599-1" and "9780134685991"
// both pass. Kept lenient on purpose so it does not block the team's data.
const isValidIsbn = (value) => {
    if (!value) {
        return false;
    }

    const cleaned = value.replace(/[\s-]/g, "");

    const isbn10 = /^\d{9}[\dXx]$/;
    const isbn13 = /^\d{13}$/;

    return isbn10.test(cleaned) || isbn13.test(cleaned);
};

const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true
        },

        author: {
            type: String,
            required: [true, "Author is required"],
            trim: true
        },

        isbn: {
            type: String,
            required: [true, "ISBN is required"],
            unique: true,
            trim: true,
            validate: {
                validator: isValidIsbn,
                message: "ISBN must be a valid 10- or 13-digit ISBN"
            }
        },

        // Category / genre — powers guest catalogue browsing (BOOK-F-005).
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true
        },

        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"]
        },

        condition: {
            type: String,
            enum: {
                values: BOOK_CONDITIONS,
                message: "Condition must be one of: " + BOOK_CONDITIONS.join(", ")
            },
            default: "Good"
        },

        // Seller shown on the detail page (BOOK-F-007). Kept as a plain
        // display string for Sprint 1: full seller accounts / listing
        // ownership are a separate feature area owned with Gautam.
        seller: {
            type: String,
            trim: true,
            default: "Unknown Seller"
        },

        coverImage: {
            type: String,
            trim: true,
            default: ""
        },

        stock: {
            type: Number,
            default: 0,
            min: [0, "Stock cannot be negative"]
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        // Average rating — supports sorting by rating (BOOK-F-008). The
        // review module (another member) will recalculate this; it defaults
        // to 0 until then.
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        // Soft-active flag. The catalogue shows active books only, matching
        // the SRS ("Category page lists all active listings").
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes to keep keyword search and category browsing fast (BOOK-F-006).
bookSchema.index({ title: "text", author: "text" });
bookSchema.index({ category: 1 });

module.exports = mongoose.model("Book", bookSchema);
module.exports.BOOK_CONDITIONS = BOOK_CONDITIONS;
