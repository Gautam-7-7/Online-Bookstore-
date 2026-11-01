const mongoose = require("mongoose");
const Book = require("../models/Book");
const ModerationReport = require("../models/ModerationReport");

const createBookReport = async (req, res) => {
    const bookId = req.params.bookId || req.params.id;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ message: "Invalid book ID" });
    }
    if (reason.length < 5 || reason.length > 500) {
        return res.status(400).json({ message: "Report reason must be 5 to 500 characters" });
    }
    try {
        const book = await Book.findOne({ _id: bookId, isActive: true }).select("_id");
        if (!book) {
            return res.status(404).json({ message: "Active listing not found" });
        }
        const report = await ModerationReport.create({
            book: book._id,
            reporter: req.user.id,
            reason
        });
        await Book.updateOne(
            { _id: book._id },
            { $set: { moderationStatus: "flagged" } }
        );
        return res.status(201).json({
            message: "Report submitted for administrator review",
            report: { id: report._id, status: report.status }
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to submit listing report" });
    }
};

module.exports = { createBookReport };
