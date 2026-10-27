const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getUserById, isEnabled } = require("../config/authMemory");
const { getJwtSecret } = require("../controllers/authController");

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication token missing"
        });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({
            message: "Authentication token missing"
        });
    }

    try {
        const secret = getJwtSecret();
        if (!secret) {
            return res.status(500).json({
                message: "JWT secret is not configured."
            });
        }

        const decoded = jwt.verify(token, secret);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                message: "Invalid token"
            });
        }

        let user;
        if (isEnabled()) {
            user = getUserById(decoded.userId);
        } else {
            user = await User.findById(decoded.userId).select("-password");
        }

        if (!user) {
            return res.status(401).json({
                message: "User not found or token invalid"
            });
        }

        req.user = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Token expired"
            });
        }

        return res.status(401).json({
            message: "Invalid token"
        });
    }
};

module.exports = { protect };
