const mongoose = require("mongoose");
const Book = require("../models/Book");
const Review = require("../models/Review");
const SellerRating = require("../models/SellerRating");

const aggregate = async (match) => {
    const [result] = await Review.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$rating" },
                reviewCount: { $sum: 1 }
            }
        }
    ]);

    return {
        averageRating: result
            ? Math.round(result.averageRating * 100) / 100
            : 0,
        reviewCount: result?.reviewCount || 0
    };
};

const recalculateBookRating = async (bookId) => {
    const bookObjectId = new mongoose.Types.ObjectId(bookId);
    const rating = await aggregate({ book: bookObjectId });
    await Book.updateOne(
        { _id: bookObjectId },
        { $set: { rating: rating.averageRating } }
    );
    return rating;
};

const recalculateSellerRating = async (seller) => {
    const rating = await aggregate({ seller });
    await SellerRating.findOneAndUpdate(
        { seller },
        { $set: { averageRating: rating.averageRating, reviewCount: rating.reviewCount } },
        { upsert: true, new: true, runValidators: true }
    );
    return rating;
};

module.exports = { recalculateBookRating, recalculateSellerRating };
