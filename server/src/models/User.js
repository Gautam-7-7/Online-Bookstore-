const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ["buyer", "seller", "admin"],
            default: "buyer",
            index: true
        },
        isSellerVerified: {
            type: Boolean,
            default: false
        },
        isSuspended: {
            type: Boolean,
            default: false,
            index: true
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 30,
            default: ""
        },
        passwordResetTokenHash: {
            type: String,
            default: null,
            select: false
        },
        passwordResetExpiresAt: {
            type: Date,
            default: null,
            select: false
        },
        passwordResetRequestedAt: {
            type: Date,
            default: null,
            select: false
        },

        failedLoginAttempts: {
            type: Number,
            default: 0
        },

        lockUntil: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);