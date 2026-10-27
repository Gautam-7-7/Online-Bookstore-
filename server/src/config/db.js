const mongoose = require("mongoose");

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        if (process.env.NODE_ENV === "production") {
            console.error(
                "MONGODB_URI is not configured. Set it before starting the API in production."
            );
            process.exit(1);
            return;
        }

        console.warn(
            "MONGODB_URI not configured. Using the development in-memory auth store."
        );
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
