jest.mock("../src/models/Book", () => ({
    countDocuments: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn()
}));
jest.mock("../src/models/Order", () => ({
    countDocuments: jest.fn(),
    updateMany: jest.fn()
}));
jest.mock("../src/models/User", () => ({
    find: jest.fn()
}));

const Book = require("../src/models/Book");
const Order = require("../src/models/Order");
const User = require("../src/models/User");
const { backfillListingOwners } = require("../scripts/backfillListingOwners");

const createUserQuery = (users) => ({
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(users)
});

describe("Legacy listing owner migration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Book.find.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                { seller: "Unique Seller" },
                { seller: "Ambiguous Seller" },
                { seller: "Unknown Seller" }
            ])
        });
        User.find.mockImplementation(({ name }) =>
            createUserQuery(
                name === "Unique Seller"
                    ? [{ _id: "user-1" }]
                    : [{ _id: "user-2" }, { _id: "user-3" }]
            )
        );
        Book.countDocuments.mockResolvedValue(1);
        Order.countDocuments.mockResolvedValue(2);
        Book.updateMany.mockResolvedValue({ modifiedCount: 1 });
        Order.updateMany.mockResolvedValue({ modifiedCount: 2 });
    });

    test("dry-run reports only unique-name matches without modifying data", async () => {
        const result = await backfillListingOwners();

        expect(result).toMatchObject({
            mode: "dry-run",
            matchedSellerNames: 1,
            booksMatched: 1,
            orderRecordsMatched: 2,
            booksUpdated: 0,
            orderRecordsUpdated: 0,
            unresolved: [{ seller: "Ambiguous Seller", matchingAccounts: 2 }]
        });
        expect(Book.updateMany).not.toHaveBeenCalled();
        expect(Order.updateMany).not.toHaveBeenCalled();
    });

    test("apply updates only exact unowned records for unique seller names", async () => {
        const result = await backfillListingOwners({ apply: true });

        expect(Book.updateMany).toHaveBeenCalledWith(
            { seller: "Unique Seller", sellerId: null },
            { $set: { sellerId: "user-1" } }
        );
        expect(Order.updateMany).toHaveBeenCalledWith(
            {
                "items.seller": "Unique Seller",
                "items.sellerId": null
            },
            { $set: { "items.$[item].sellerId": "user-1" } },
            {
                arrayFilters: [
                    { "item.seller": "Unique Seller", "item.sellerId": null }
                ]
            }
        );
        expect(Book.updateMany).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
            mode: "apply",
            booksUpdated: 1,
            orderRecordsUpdated: 2
        });
    });
});
