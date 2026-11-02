jest.mock("../src/models/Review", () => ({
    aggregate: jest.fn()
}));
jest.mock("../src/models/Book", () => ({
    updateOne: jest.fn()
}));
jest.mock("../src/models/SellerRating", () => ({
    findOneAndUpdate: jest.fn()
}));

const Review = require("../src/models/Review");
const Book = require("../src/models/Book");
const SellerRating = require("../src/models/SellerRating");
const mongoose = require("mongoose");
const {
    recalculateBookRating,
    recalculateSellerRating
} = require("../src/services/ratings");

describe("Rating aggregation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Book.updateOne.mockResolvedValue({});
        SellerRating.findOneAndUpdate.mockResolvedValue({});
    });

    test("recalculates a book average from every stored review", async () => {
        Review.aggregate.mockResolvedValue([{ averageRating: 4.3333, reviewCount: 3 }]);
        const bookId = new mongoose.Types.ObjectId();

        await expect(recalculateBookRating(bookId.toString())).resolves.toEqual({
            averageRating: 4.33,
            reviewCount: 3
        });
        expect(Review.aggregate).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ $match: { book: bookId } })
            ])
        );
        expect(Book.updateOne).toHaveBeenCalledWith(
            { _id: bookId },
            { $set: { rating: 4.33 } }
        );
    });

    test("recalculates and persists a seller average", async () => {
        Review.aggregate.mockResolvedValue([{ averageRating: 4, reviewCount: 2 }]);

        await expect(recalculateSellerRating("Seller")).resolves.toEqual({
            averageRating: 4,
            reviewCount: 2
        });
        expect(SellerRating.findOneAndUpdate).toHaveBeenCalledWith(
            { seller: "Seller" },
            { $set: { averageRating: 4, reviewCount: 2 } },
            { upsert: true, new: true, runValidators: true }
        );
    });

    test("resets aggregate values when no reviews remain", async () => {
        Review.aggregate.mockResolvedValue([]);

        await expect(recalculateBookRating(new mongoose.Types.ObjectId().toString())).resolves.toEqual({
            averageRating: 0,
            reviewCount: 0
        });
    });
});
