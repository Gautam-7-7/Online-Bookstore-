const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const cartRoutes = require("./routes/cartRoutes");
const couponRoutes = require("./routes/couponRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const shippingAddressRoutes = require("./routes/shippingAddressRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(
    "/api/payments/razorpay/webhook",
    express.raw({ type: "application/json", limit: "100kb" })
);
app.use(express.json({ limit: "100kb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/addresses", shippingAddressRoutes);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Online Bookstore API is running"
    });
});

module.exports = app;