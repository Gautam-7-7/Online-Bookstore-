const Coupon = require("../models/Coupon");

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const findValidCoupon = async (code, subtotal, now = new Date()) => {
    const coupon = await Coupon.findOne({
        code: String(code).trim().toUpperCase()
    });

    if (
        !coupon ||
        !coupon.isActive ||
        coupon.startsAt > now ||
        coupon.expiresAt <= now ||
        (coupon.maxRedemptions !== null &&
            coupon.maxRedemptions !== undefined &&
            coupon.redemptionCount >= coupon.maxRedemptions)
    ) {
        return { error: "Coupon is invalid, expired, or no longer available" };
    }

    if (subtotal < coupon.minimumOrderAmount) {
        return {
            error: `Order minimum for this coupon is ${coupon.minimumOrderAmount.toFixed(2)}`
        };
    }

    const rawDiscount =
        coupon.discountType === "percentage"
            ? (subtotal * coupon.discountValue) / 100
            : coupon.discountValue;
    const discount = roundMoney(Math.min(subtotal, rawDiscount));

    return {
        coupon,
        discount,
        total: roundMoney(subtotal - discount)
    };
};

const reserveCouponRedemption = async (coupon, now = new Date()) => {
    const validity = {
        _id: coupon._id,
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gt: now }
    };

    if (coupon.maxRedemptions === null || coupon.maxRedemptions === undefined) {
        return Boolean(await Coupon.exists(validity));
    }

    const reserved = await Coupon.findOneAndUpdate(
        { ...validity, redemptionCount: { $lt: coupon.maxRedemptions } },
        { $inc: { redemptionCount: 1 } },
        { new: true }
    );

    return Boolean(reserved);
};

const releaseCouponRedemption = async (coupon) => {
    if (coupon?.maxRedemptions !== null && coupon?.maxRedemptions !== undefined) {
        await Coupon.updateOne(
            { _id: coupon._id, redemptionCount: { $gt: 0 } },
            { $inc: { redemptionCount: -1 } }
        );
    }
};

module.exports = {
    findValidCoupon,
    releaseCouponRedemption,
    reserveCouponRedemption,
    roundMoney
};
