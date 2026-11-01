require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
        throw new Error("PORT must be a valid TCP port");
    }
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Online Bookstore API running on http://localhost:${PORT}`);
    });
};

startServer().catch((error) => {
    console.error("API startup failed:", error.message);
    process.exitCode = 1;
});