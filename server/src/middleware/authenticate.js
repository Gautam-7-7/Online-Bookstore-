const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
    const authorization = req.get("authorization");
    const [scheme, token] = authorization?.split(" ") || [];

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.userId).select("name email");

        if (!user) {
            return res.status(401).json({ message: "Invalid authentication token" });
        }

        req.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Invalid or expired authentication token" });
        }

        return next(error);
    }
};

module.exports = authenticate;
