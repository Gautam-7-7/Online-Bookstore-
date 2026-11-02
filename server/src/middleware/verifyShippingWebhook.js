const crypto = require("crypto");

const verifyShippingWebhook = (req, res, next) => {
    const expected = process.env.SHIPPING_WEBHOOK_SECRET;
    if (!expected || /replace|example|your[_ -]/i.test(expected)) {
        return res.status(503).json({
            message: "Shipping webhook credentials are not configured with a real secret"
        });
    }

    const supplied = req.get("x-shipping-webhook-secret") || "";
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    const matches =
        expectedBuffer.length === suppliedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);

    if (!matches) {
        return res.status(401).json({ message: "Invalid shipping webhook credentials" });
    }

    return next();
};

module.exports = verifyShippingWebhook;
