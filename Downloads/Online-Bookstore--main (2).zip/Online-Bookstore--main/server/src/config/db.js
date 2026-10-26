const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const connectDB = async () => {
    try {
        // Try connecting to your MONGODB_URI first
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.warn(" Atlas connection failed. Falling back to local In-Memory Database...");
        try {
            const mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            await mongoose.connect(uri);
            console.log("MongoDB connected successfully (In-Memory Fallback)");
        } catch (memError) {
            console.error("MongoDB connection failed:", memError.message);
            process.exit(1);
        }
    }
};

module.exports = connectDB;