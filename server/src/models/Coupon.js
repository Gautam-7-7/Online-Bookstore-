const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            match: /^[A-Z0-9_-]{3,32}$/
        },
        discountType: {
            type: String,
            required: true,
            enum: ["percentage", "fixed"]
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        minimumOrderAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        startsAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        },
        maxRedemptions: {
            type: Number,
            default: null,
            min: 1,
            validate: Number.isInteger
        },
        redemptionCount: {
            type: Number,
            default: 0,
            min: 0,
            validate: Number.isInteger
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

couponSchema.path("discountValue").validate(function (value) {
    return this.discountType !== "percentage" || value <= 100;
}, "Percentage discounts cannot exceed 100%");

module.exports = mongoose.model("Coupon", couponSchema);
