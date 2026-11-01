const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const PASSWORD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

// Register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        const normalizedEmail =
            typeof email === "string" ? email.trim().toLowerCase() : "";

        if (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 100 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
            typeof password !== "string" ||
            !PASSWORD_PATTERN.test(password)
        ) {
            return res.status(400).json({
                message: "A valid name and email and a 10+ character password with uppercase, lowercase, number and symbol are required"
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (user.isSuspended) {
            return res.status(403).json({
                message: "This account is suspended. Contact support for assistance."
            });
        }

        // Check account lock
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(423).json({
                message: "Account temporarily locked. Try again later."
            });
        }

        // Reset expired lock
        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
            await user.save();
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            user.failedLoginAttempts += 1;

            if (user.failedLoginAttempts >= 5) {
                if (!user.lockUntil || user.lockUntil <= Date.now()) {
                    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                    await AuditLog.create({
                        actor: user._id,
                        action: "auth.account_locked",
                        targetType: "user",
                        targetId: user._id.toString(),
                        details: { lockUntil: user.lockUntil, source: "failed_login_attempts" }
                    });
                }
            }

            await user.save();

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Successful login
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
};

module.exports = {
    register,
    login
};