const mongoose = require("mongoose");
const ShippingAddress = require("../models/ShippingAddress");

const ADDRESS_FIELDS = [
    "fullName",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "phone"
];

const normalizeAddress = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }
    if (
        typeof body.label !== "string" ||
        !body.label.trim() ||
        body.label.trim().length > 40
    ) {
        return null;
    }

    const address = { label: body.label.trim() };
    for (const field of ADDRESS_FIELDS) {
        const value = body[field];
        if (
            typeof value !== "string" ||
            (field !== "addressLine2" && !value.trim()) ||
            value.trim().length > 160
        ) {
            return null;
        }
        address[field] = value.trim();
    }
    address.isDefault = body.isDefault === true;
    return address;
};

const listShippingAddresses = async (req, res) => {
    try {
        const addresses = await ShippingAddress.find({ user: req.user.id })
            .sort({ isDefault: -1, updatedAt: -1 })
            .lean();
        return res.status(200).json({ addresses });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve shipping addresses" });
    }
};

const createShippingAddress = async (req, res) => {
    try {
        const address = normalizeAddress(req.body);
        if (!address) {
            return res.status(400).json({
                message: "A label and complete valid shipping address are required"
            });
        }

        const existingCount = await ShippingAddress.countDocuments({
            user: req.user.id
        });
        if (existingCount >= 10) {
            return res.status(409).json({
                message: "You can save up to 10 shipping addresses"
            });
        }
        if (address.isDefault || existingCount === 0) {
            await ShippingAddress.updateMany(
                { user: req.user.id, isDefault: true },
                { $set: { isDefault: false } }
            );
            address.isDefault = true;
        }

        const savedAddress = await ShippingAddress.create({
            ...address,
            user: req.user.id
        });
        return res.status(201).json({ address: savedAddress });
    } catch (error) {
        return res.status(500).json({ message: "Failed to save shipping address" });
    }
};

const setDefaultShippingAddress = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.addressId)) {
            return res.status(400).json({ message: "Invalid address ID" });
        }
        const address = await ShippingAddress.findOne({
            _id: req.params.addressId,
            user: req.user.id
        });
        if (!address) {
            return res.status(404).json({ message: "Shipping address not found" });
        }

        await ShippingAddress.updateMany(
            { user: req.user.id, isDefault: true },
            { $set: { isDefault: false } }
        );
        address.isDefault = true;
        await address.save();
        return res.status(200).json({ address });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update default address" });
    }
};

const deleteShippingAddress = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.addressId)) {
            return res.status(400).json({ message: "Invalid address ID" });
        }
        const address = await ShippingAddress.findOneAndDelete({
            _id: req.params.addressId,
            user: req.user.id
        });
        if (!address) {
            return res.status(404).json({ message: "Shipping address not found" });
        }

        if (address.isDefault) {
            const replacement = await ShippingAddress.findOne({ user: req.user.id })
                .sort({ updatedAt: -1 });
            if (replacement) {
                replacement.isDefault = true;
                await replacement.save();
            }
        }
        return res.status(200).json({ message: "Shipping address removed" });
    } catch (error) {
        return res.status(500).json({ message: "Failed to remove shipping address" });
    }
};

module.exports = {
    createShippingAddress,
    deleteShippingAddress,
    listShippingAddresses,
    setDefaultShippingAddress
};
