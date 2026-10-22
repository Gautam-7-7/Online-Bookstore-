// Seed the database with a few sample books for local development.
// Run from the server/ directory with:  node src/scripts/seedBooks.js
// The frontend still fetches real data from the API — this only gives
// the local catalogue something to show.

require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Book = require("../models/Book");

const sampleBooks = [
    {
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "9780132350884",
        category: "Programming",
        price: 540,
        condition: "New",
        seller: "TechReads",
        stock: 12,
        rating: 4.7,
        coverImage: "",
        description:
            "A handbook of agile software craftsmanship covering how to write readable, maintainable code."
    },
    {
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt, David Thomas",
        isbn: "9780135957059",
        category: "Programming",
        price: 620,
        condition: "Like New",
        seller: "TechReads",
        stock: 8,
        rating: 4.8,
        coverImage: "",
        description:
            "Classic advice on software craftsmanship, from your journey to mastery."
    },
    {
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        isbn: "9780099590088",
        category: "History",
        price: 410,
        condition: "Good",
        seller: "BookNook",
        stock: 20,
        rating: 4.6,
        coverImage: "",
        description:
            "An exploration of how Homo sapiens came to dominate the planet."
    },
    {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "9781847941831",
        category: "Self-Help",
        price: 350,
        condition: "New",
        seller: "BookNook",
        stock: 35,
        rating: 4.9,
        coverImage: "",
        description:
            "An easy and proven way to build good habits and break bad ones."
    },
    {
        title: "Introduction to Algorithms",
        author: "Cormen, Leiserson, Rivest, Stein",
        isbn: "9780262046305",
        category: "Programming",
        price: 890,
        condition: "Good",
        seller: "CampusBooks",
        stock: 5,
        rating: 4.5,
        coverImage: "",
        description:
            "Comprehensive textbook covering a broad range of algorithms in depth."
    },
    {
        title: "The Alchemist",
        author: "Paulo Coelho",
        isbn: "9780061122415",
        category: "Fiction",
        price: 280,
        condition: "Fair",
        seller: "ReadMore",
        stock: 15,
        rating: 4.3,
        coverImage: "",
        description:
            "A fable about following your dream and listening to your heart."
    }
];

const seed = async () => {
    try {
        await connectDB();

        // Clear only the sample ISBNs so we do not wipe the team's data.
        const isbns = sampleBooks.map((book) => book.isbn);
        await Book.deleteMany({ isbn: { $in: isbns } });

        const created = await Book.insertMany(sampleBooks);
        console.log(`Seeded ${created.length} books successfully.`);
    } catch (error) {
        console.error("Seeding failed:", error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

seed();
