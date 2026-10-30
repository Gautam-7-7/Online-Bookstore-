const mongoose = require("mongoose");

const shippingAddressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40
        },
        fullName: { type: String, required: true, trim: true, maxlength: 160 },
        addressLine1: { type: String, required: true, trim: true, maxlength: 160 },
        addressLine2: { type: String, trim: true, maxlength: 160, default: "" },
        city: { type: String, required: true, trim: true, maxlength: 160 },
        state: { type: String, required: true, trim: true, maxlength: 160 },
        postalCode: { type: String, required: true, trim: true, maxlength: 160 },
        country: { type: String, required: true, trim: true, maxlength: 160 },
        phone: { type: String, required: true, trim: true, maxlength: 160 },
        isDefault: { type: Boolean, default: false }
    },
    { timestamps: true }
);

shippingAddressSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ShippingAddress", shippingAddressSchema);
