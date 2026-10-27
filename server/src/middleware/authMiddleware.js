const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
    createMemoryUser,
    getUserByEmail,
    getUserById,
    isEnabled,
    normalizeEmail
} = require("../config/authMemory");

const getJwtSecret = () =>
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-jwt-secret-change-me" : undefined);

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const findUserByEmail = async (email) => {
    if (isEnabled()) {
        return getUserByEmail(email);
    }
    return User.findOne({ email: normalizeEmail(email) });
};

const findUserById = async (userId) => {
    if (isEnabled()) {
        return getUserById(userId);
    }
    return User.findById(userId).select("-password");
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (!passwordPolicy.test(String(password))) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await findUserByEmail(normalizedEmail);

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        let user;
        if (isEnabled()) {
            user = createMemoryUser({
                name,
                email: normalizedEmail,
                password: hashedPassword
            });
        } else {
            user = await User.create({
                name,
                email: normalizedEmail,
                password: hashedPassword
            });
        }

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await findUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(423).json({
                message: "Account temporarily locked. Try again later."
            });
        }

        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
            if (isEnabled()) {
                const stored = getUserByEmail(user.email);
                if (stored) {
                    stored.failedLoginAttempts = 0;
                    stored.lockUntil = null;
                }
            } else {
                await user.save();
            }
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            user.failedLoginAttempts += 1;

            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            if (isEnabled()) {
                const stored = getUserByEmail(user.email);
                if (stored) {
                    stored.failedLoginAttempts = user.failedLoginAttempts;
                    stored.lockUntil = user.lockUntil;
                }
            } else {
                await user.save();
            }

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;

        if (isEnabled()) {
            const stored = getUserByEmail(user.email);
            if (stored) {
                stored.failedLoginAttempts = 0;
                stored.lockUntil = null;
            }
        } else {
            await user.save();
        }

        const secret = getJwtSecret();
        if (!secret) {
            return res.status(500).json({
                message: "JWT secret is not configured."
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            secret,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};

const getMe = async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    return res.status(200).json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });
};

module.exports = {
    register,
    login,
    getMe,
    getJwtSecret,
    findUserByEmail,
    findUserById
};
