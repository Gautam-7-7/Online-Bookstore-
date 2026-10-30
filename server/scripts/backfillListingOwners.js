require("dotenv").config();

const mongoose = require("mongoose");
const Book = require("../src/models/Book");
const Order = require("../src/models/Order");
const User = require("../src/models/User");

const backfillListingOwners = async ({ apply = false } = {}) => {
    const legacyBooks = await Book.find({ sellerId: null })
        .select("_id seller")
        .lean();
    const sellerNames = [
        ...new Set(
            legacyBooks
                .map((book) => book.seller?.trim())
                .filter((name) => name && name !== "Unknown Seller")
        )
    ];
    const mappings = [];
    const unresolved = [];

    for (const sellerName of sellerNames) {
        const users = await User.find({ name: sellerName })
            .select("_id")
            .limit(2)
            .lean();
        if (users.length !== 1) {
            unresolved.push({ seller: sellerName, matchingAccounts: users.length });
            continue;
        }
        mappings.push({ seller: sellerName, userId: users[0]._id });
    }

    const result = {
        mode: apply ? "apply" : "dry-run",
        matchedSellerNames: mappings.length,
        unresolved,
        booksMatched: 0,
        orderRecordsMatched: 0,
        booksUpdated: 0,
        orderRecordsUpdated: 0
    };

    for (const mapping of mappings) {
        const [bookCount, orderCount] = await Promise.all([
            Book.countDocuments({ seller: mapping.seller, sellerId: null }),
            Order.countDocuments({
                "items.seller": mapping.seller,
                "items.sellerId": null
            })
        ]);
        result.booksMatched += bookCount;
        result.orderRecordsMatched += orderCount;

        if (apply) {
            const [bookUpdate, orderUpdate] = await Promise.all([
                Book.updateMany(
                    { seller: mapping.seller, sellerId: null },
                    { $set: { sellerId: mapping.userId } }
                ),
                Order.updateMany(
                    {
                        "items.seller": mapping.seller,
                        "items.sellerId": null
                    },
                    { $set: { "items.$[item].sellerId": mapping.userId } },
                    {
                        arrayFilters: [
                            {
                                "item.seller": mapping.seller,
                                "item.sellerId": null
                            }
                        ]
                    }
                )
            ]);
            result.booksUpdated += bookUpdate.modifiedCount;
            result.orderRecordsUpdated += orderUpdate.modifiedCount;
        }
    }

    return result;
};

const main = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI must be configured before running this migration");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await backfillListingOwners({
        apply: process.argv.includes("--apply")
    });
    console.log(JSON.stringify(result, null, 2));
};

if (require.main === module) {
    main()
        .catch((error) => {
            console.error("Listing owner migration failed:", error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }
        });
}

module.exports = { backfillListingOwners };
