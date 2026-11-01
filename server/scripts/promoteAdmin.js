require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");

const email =
    typeof process.argv[2] === "string" ? process.argv[2].trim().toLowerCase() : "";

const promoteAdmin = async () => {
    if (!process.env.MONGODB_URI || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Usage: npm run admin:promote -- account@example.com (with MONGODB_URI configured)");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOneAndUpdate(
        { email },
        { $set: { role: "admin", isSellerVerified: false } },
        { new: true, runValidators: true }
    ).select("name email role");
    if (!user) {
        throw new Error(`No existing account found for ${email}; register it before promoting`);
    }
    console.log(`Promoted ${user.email} to administrator.`);
};

promoteAdmin()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.disconnect();
        }
    });
