jest.mock("../src/models/Book", () => ({
    aggregate: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
}));
jest.mock("../src/models/Order", () => ({
    aggregate: jest.fn()
}));
jest.mock("../src/models/SellerRating", () => ({
    findOne: jest.fn()
}));

const mongoose = require("mongoose");
const Book = require("../src/models/Book");
const Order = require("../src/models/Order");
const SellerRating = require("../src/models/SellerRating");
const {
    createBook,
    getSellerDashboard,
    getSellerBooks,
    getSellerBook,
    updateBook,
    removeBook
} = require("../src/controllers/bookController");

const sellerId = new mongoose.Types.ObjectId();
const bookId = new mongoose.Types.ObjectId();
const seller = { id: sellerId, name: "Seller One" };
const createResponse = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
};

describe("Seller listing management", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("creates owner-scoped listings and normalizes ISBN duplicate detection", async () => {
        Book.findOne.mockResolvedValue(null);
        Book.create.mockResolvedValue({ _id: bookId, title: "Test Book" });
        const response = createResponse();

        await createBook(
            {
                user: seller,
                body: {
                    title: "Test Book",
                    author: "Author",
                    isbn: "978-0-13-235088-4",
                    category: "Technology",
                    price: 20
                }
            },
            response
        );

        expect(Book.findOne).toHaveBeenCalledWith({ isbn: "9780132350884" });
        expect(Book.create).toHaveBeenCalledWith(
            expect.objectContaining({
                isbn: "9780132350884",
                seller: "Seller One",
                sellerId
            })
        );
        expect(response.status).toHaveBeenCalledWith(201);
    });

    test("flags duplicate ISBNs with an explicit conflict response", async () => {
        Book.findOne.mockResolvedValue({ _id: bookId });
        const response = createResponse();

        await createBook(
            {
                user: seller,
                body: {
                    title: "Duplicate",
                    author: "Author",
                    isbn: "9780132350884",
                    category: "Technology",
                    price: 20
                }
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(409);
        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({ duplicate: true, duplicateBookId: bookId })
        );
        expect(Book.create).not.toHaveBeenCalled();
    });

    test("lists and fetches only the authenticated seller's listings", async () => {
        const listings = [{ _id: bookId }];
        const query = { sort: jest.fn().mockResolvedValue(listings) };
        Book.find.mockReturnValue(query);
        const response = createResponse();

        await getSellerBooks({ user: seller }, response);

        expect(Book.find).toHaveBeenCalledWith({ sellerId });
        expect(response.json).toHaveBeenCalledWith({ books: listings });

        Book.findOne.mockResolvedValue({ _id: bookId });
        const detailResponse = createResponse();
        await getSellerBook(
            { params: { id: bookId.toString() }, user: seller },
            detailResponse
        );
        expect(Book.findOne).toHaveBeenCalledWith({
            _id: bookId.toString(),
            sellerId
        });
        expect(detailResponse.status).toHaveBeenCalledWith(200);
    });

    test("updates only the owner's active listing and blocks protected fields", async () => {
        const book = { _id: bookId, title: "Before", save: jest.fn() };
        Book.findOne.mockResolvedValue(book);
        const response = createResponse();

        await updateBook(
            {
                params: { id: bookId.toString() },
                user: seller,
                body: { title: "After" }
            },
            response
        );

        expect(Book.findOne).toHaveBeenCalledWith({
            _id: bookId.toString(),
            sellerId,
            isActive: true
        });
        expect(book.title).toBe("After");
        expect(book.save).toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(200);

        const protectedResponse = createResponse();
        await updateBook(
            {
                params: { id: bookId.toString() },
                user: seller,
                body: { sellerId: new mongoose.Types.ObjectId().toString() }
            },
            protectedResponse
        );
        expect(protectedResponse.status).toHaveBeenCalledWith(400);
    });

    test("soft-removes listings so existing order references remain intact", async () => {
        Book.findOneAndUpdate.mockResolvedValue({ _id: bookId, isActive: false });
        const response = createResponse();

        await removeBook(
            { params: { id: bookId.toString() }, user: seller },
            response
        );

        expect(Book.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: bookId.toString(), sellerId, isActive: true },
            { $set: { isActive: false } },
            { new: true, runValidators: true }
        );
        expect(response.status).toHaveBeenCalledWith(200);
    });

    test("returns seller listing, sales, and rating summary", async () => {
        Book.aggregate.mockResolvedValue([
            { totalListings: 3, activeListings: 2, totalStock: 8 }
        ]);
        Order.aggregate.mockResolvedValue([
            { orders: 2, unitsSold: 4, revenue: 180 }
        ]);
        SellerRating.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                averageRating: 4.5,
                reviewCount: 6
            })
        });
        const response = createResponse();

        await getSellerDashboard({ user: seller }, response);

        expect(Book.aggregate.mock.calls[0][0][0]).toEqual({
            $match: { sellerId }
        });
        expect(Order.aggregate.mock.calls[0][0][2]).toEqual({
            $match: { "items.sellerId": sellerId }
        });
        expect(Order.aggregate.mock.calls[0][0].at(-1)).toEqual({
            $project: {
                _id: 0,
                orders: 1,
                unitsSold: 1,
                revenue: { $round: ["$revenue", 2] }
            }
        });
        expect(response.json).toHaveBeenCalledWith({
            seller: "Seller One",
            listings: { totalListings: 3, activeListings: 2, totalStock: 8 },
            sales: { orders: 2, unitsSold: 4, revenue: 180 },
            rating: { averageRating: 4.5, reviewCount: 6 }
        });
    });
});
