const mongoose = require("mongoose");

const ORDER_STATUSES = [
    "Payment Pending",
    "Payment Failed",
    "Placed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Return Requested",
    "Returned"
];

const orderSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        idempotencyKey: {
            type: String,
            required: true,
            minlength: 8,
            maxlength: 128
        },
        gatewayOrderId: {
            type: String,
            default: null
        },
        cartUpdatedAt: {
            type: Date,
            default: null
        },
        currency: {
            type: String,
            required: true,
            default: "INR",
            match: /^[A-Z]{3}$/
        },
        stockReserved: {
            type: Boolean,
            default: false
        },
        couponReserved: {
            type: Boolean,
            default: false
        },
        items: [
            {
                book: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Book",
                    required: true
                },
                title: { type: String, required: true },
                seller: { type: String, required: true },
                sellerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                    validate: Number.isSafeInteger
                },
                unitPrice: { type: Number, required: true, min: 0 }
            }
        ],
        subtotal: { type: Number, required: true, min: 0 },
        discount: { type: Number, required: true, min: 0, default: 0 },
        total: { type: Number, required: true, min: 0 },
        coupon: {
            code: { type: String, default: null },
            discountType: { type: String, enum: ["percentage", "fixed", null], default: null },
            discountValue: { type: Number, default: 0 }
        },
        shippingAddress: {
            fullName: { type: String, required: true, trim: true },
            addressLine1: { type: String, required: true, trim: true },
            addressLine2: { type: String, trim: true, default: "" },
            city: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true },
            postalCode: { type: String, required: true, trim: true },
            country: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true }
        },
        payment: {
            provider: { type: String, default: null },
            transactionId: { type: String, default: null },
            status: {
                type: String,
                enum: ["pending", "succeeded", "failed", "refunded"],
                default: "pending"
            },
            brand: { type: String, default: null },
            last4: { type: String, match: /^\d{4}$/, default: null }
        },
        returnRequest: {
            type: {
                type: String,
                enum: ["cancellation", "return"],
                default: null
            },
            status: {
                type: String,
                enum: ["requested", "refund_pending", "refunded", "refund_failed", null],
                default: null
            },
            reason: { type: String, trim: true, maxlength: 500, default: null },
            requestedAt: { type: Date, default: null },
            returnWindowDays: { type: Number, min: 1, max: 30, default: null },
            refundId: { type: String, default: null }
        },
        status: {
            type: String,
            enum: ORDER_STATUSES,
            default: "Payment Pending"
        },
        trackingHistory: [
            {
                status: { type: String, enum: ORDER_STATUSES, required: true },
                occurredAt: { type: Date, required: true },
                source: { type: String, required: true }
            }
        ],
        webhookEventIds: {
            type: [String],
            default: []
        }
    },
    { timestamps: true }
);

orderSchema.index({ buyer: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index(
    { gatewayOrderId: 1 },
    { unique: true, partialFilterExpression: { gatewayOrderId: { $type: "string" } } }
);

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
