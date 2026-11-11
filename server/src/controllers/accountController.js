const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../services/email");

const PASSWORD_PATTERN =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "name email phone role isSellerVerified createdAt"
        );
        if (!user) {
            return res.status(404).json({ message: "Account not found" });
        }
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve profile" });
    }
};

const updateProfile = async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ message: "Profile fields are required" });
    }
    const fields = Object.keys(body);
    if (
        !fields.length ||
        fields.some((field) => !["name", "email", "phone"].includes(field))
    ) {
        return res.status(400).json({ message: "Only name, email and phone can be updated" });
    }

    const updates = {};
    for (const field of fields) {
        if (typeof body[field] !== "string") {
            return res.status(400).json({ message: `${field} must be a string` });
        }
        const value = body[field].trim();
        if (field === "name" && (!value || value.length > 100)) {
            return res.status(400).json({ message: "Name must be 1 to 100 characters" });
        }
        if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return res.status(400).json({ message: "Enter a valid email address" });
        }
        if (field === "phone" && value.length > 30) {
            return res.status(400).json({ message: "Phone must be 30 characters or fewer" });
        }
        updates[field] = field === "email" ? value.toLowerCase() : value;
    }

    try {
        const user = await User.findByIdAndUpdate(req.user.id, updates, {
            new: true,
            runValidators: true
        }).select("name email phone role isSellerVerified createdAt");
        if (!user) {
            return res.status(404).json({ message: "Account not found" });
        }
        return res.status(200).json({ message: "Profile updated", user });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "That email is already in use" });
        }
        return res.status(500).json({ message: "Failed to update profile" });
    }
};

const requestPasswordReset = async (req, res) => {
    const email =
        typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "A valid email address is required" });
    }

    let user;
    try {
        user = await User.findOne({ email }).select(
            "+passwordResetRequestedAt +passwordResetTokenHash +passwordResetExpiresAt"
        );
        if (!user || user.isSuspended) {
            return res.status(202).json({
                message: "If an eligible account exists, password reset instructions will be sent."
            });
        }
        if (
            user.passwordResetRequestedAt &&
            Date.now() - user.passwordResetRequestedAt.getTime() < 60_000
        ) {
            return res.status(202).json({
                message: "If an eligible account exists, password reset instructions will be sent."
            });
        }

        const token = crypto.randomBytes(32).toString("base64url");
        user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
        user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        user.passwordResetRequestedAt = new Date();
        await user.save();

        const baseUrl = process.env.PASSWORD_RESET_URL;
        if (!baseUrl) {
            throw new Error("PASSWORD_RESET_URL is not configured");
        }
        const resetUrl = new URL(baseUrl);
        if (!["http:", "https:"].includes(resetUrl.protocol)) {
            throw new Error("PASSWORD_RESET_URL must use HTTP or HTTPS");
        }
        resetUrl.searchParams.set("token", token);
        await sendPasswordResetEmail({ email: user.email, resetUrl: resetUrl.toString() });
        return res.status(202).json({
            message: "If an eligible account exists, password reset instructions will be sent."
        });
    } catch (error) {
        console.error("Password reset email delivery failed", {
            provider: (process.env.EMAIL_PROVIDER || "smtp").toLowerCase(),
            code: error.code || "EMAIL_DELIVERY_ERROR",
            statusCode: error.statusCode || null
        });
        if (user) {
            user.passwordResetTokenHash = null;
            user.passwordResetExpiresAt = null;
            user.passwordResetRequestedAt = null;
            try {
                await user.save();
            } catch (cleanupError) {
                return res.status(500).json({
                    message: "Password reset delivery failed and temporary credentials need administrative cleanup."
                });
            }
        }
        return res.status(503).json({
            message: "Password reset email is temporarily unavailable; try again later."
        });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body || {};
    if (
        typeof token !== "string" ||
        token.length < 32 ||
        typeof password !== "string" ||
        !PASSWORD_PATTERN.test(password)
    ) {
        return res.status(400).json({
            message: "A valid reset token and password (10+ characters with uppercase, lowercase, number and symbol) are required"
        });
    }
    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: { $gt: new Date() },
            isSuspended: false
        }).select("+passwordResetTokenHash +passwordResetExpiresAt");
        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or expired" });
        }
        user.password = await bcrypt.hash(password, 12);
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        user.passwordResetRequestedAt = null;
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();
        return res.status(200).json({
            message: "Password reset successfully. Please log in with your new password."
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to reset password" });
    }
};

module.exports = {
    getProfile,
    requestPasswordReset,
    resetPassword,
    updateProfile
};
