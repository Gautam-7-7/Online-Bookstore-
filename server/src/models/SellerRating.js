const mongoose = require("mongoose");

const sellerRatingSchema = new mongoose.Schema(
    {
        seller: { type: String, required: true, unique: true, trim: true },
        averageRating: { type: Number, required: true, min: 0, max: 5 },
        reviewCount: { type: Number, required: true, min: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("SellerRating", sellerRatingSchema);
