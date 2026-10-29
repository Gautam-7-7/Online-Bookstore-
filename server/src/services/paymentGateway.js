const crypto = require("crypto");

const RAZORPAY_API = "https://api.razorpay.com/v1";
const DEFAULT_CURRENCY = "INR";

class PaymentGatewayError extends Error {
    constructor(code, message, status = 502) {
        super(message);
        this.name = "PaymentGatewayError";
        this.code = code;
        this.status = status;
    }
}

const getConfig = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const currency = process.env.RAZORPAY_CURRENCY || DEFAULT_CURRENCY;

    if (!keyId || !keySecret) {
        throw new PaymentGatewayError(
            "not_configured",
            "Razorpay is not configured",
            503
        );
    }
    if (!/^[A-Za-z0-9_]{3,32}$/.test(keyId) || currency !== "INR") {
        throw new PaymentGatewayError(
            "invalid_configuration",
            "Razorpay configuration is invalid",
            503
        );
    }

    return { keyId, keySecret, currency };
};

const razorpayRequest = async (path, { method = "GET", body, headers = {} } = {}) => {
    const { keyId, keySecret } = getConfig();
    let response;
    try {
        response = await fetch(`${RAZORPAY_API}${path}`, {
            method,
            headers: {
                Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
                ...(body ? { "Content-Type": "application/json" } : {}),
                ...headers
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(10000)
        });
    } catch {
        throw new PaymentGatewayError(
            "unavailable",
            "Razorpay could not be reached; safely retry the same request",
            502
        );
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new PaymentGatewayError(
            "invalid_response",
            "Razorpay returned an invalid response"
        );
    }

    if (!response.ok) {
        const code = data?.error?.code === "BAD_REQUEST_ERROR" ? "rejected" : "unavailable";
        throw new PaymentGatewayError(
            code,
            code === "rejected"
                ? "Razorpay rejected the payment request"
                : "Razorpay could not complete the request",
            code === "rejected" ? 400 : 502
        );
    }

    return data;
};

const createRazorpayOrder = async ({ amount, receipt, notes }) => {
    const { currency } = getConfig();
    const data = await razorpayRequest("/orders", {
        method: "POST",
        body: {
            amount,
            currency,
            receipt,
            notes,
            partial_payment: false
        }
    });

    if (
        typeof data.id !== "string" ||
        !/^order_[A-Za-z0-9]+$/.test(data.id) ||
        data.amount !== amount ||
        data.currency !== currency ||
        data.status !== "created"
    ) {
        throw new PaymentGatewayError(
            "invalid_response",
            "Razorpay returned an invalid order confirmation"
        );
    }

    return { keyId: getConfig().keyId, gatewayOrderId: data.id, amount, currency };
};

const verifyCheckoutSignature = ({ gatewayOrderId, paymentId, signature }) => {
    const { keySecret } = getConfig();
    if (
        typeof gatewayOrderId !== "string" ||
        typeof paymentId !== "string" ||
        typeof signature !== "string" ||
        !/^order_[A-Za-z0-9]+$/.test(gatewayOrderId) ||
        !/^pay_[A-Za-z0-9]+$/.test(paymentId) ||
        !/^[a-f0-9]{64}$/i.test(signature)
    ) {
        return false;
    }

    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${gatewayOrderId}|${paymentId}`)
        .digest();
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

const fetchRazorpayPayment = async (paymentId) => {
    if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
        throw new PaymentGatewayError("invalid_payment", "Invalid Razorpay payment ID", 400);
    }

    const payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    const { currency } = getConfig();
    if (
        payment.id !== paymentId ||
        typeof payment.order_id !== "string" ||
        !Number.isSafeInteger(payment.amount) ||
        payment.currency !== currency ||
        !["authorized", "captured", "failed"].includes(payment.status)
    ) {
        throw new PaymentGatewayError(
            "invalid_response",
            "Razorpay payment details could not be verified"
        );
    }
    return payment;
};

const captureRazorpayPayment = async ({ paymentId, amount }) => {
    const { currency } = getConfig();
    return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, {
        method: "POST",
        body: { amount, currency }
    });
};

const createRazorpayRefund = async ({ paymentId, amount, idempotencyKey, receipt }) => {
    const { currency } = getConfig();
    const refund = await razorpayRequest(
        `/payments/${encodeURIComponent(paymentId)}/refund`,
        {
            method: "POST",
            headers: { "X-Refund-Idempotency": idempotencyKey },
            body: {
                amount,
                speed: "normal",
                receipt,
                notes: { source: "online-bookstore" }
            }
        }
    );

    if (
        typeof refund.id !== "string" ||
        refund.payment_id !== paymentId ||
        refund.amount !== amount ||
        refund.currency !== currency ||
        !["pending", "processed"].includes(refund.status)
    ) {
        throw new PaymentGatewayError(
            "invalid_response",
            "Razorpay refund response could not be verified"
        );
    }

    return { id: refund.id, status: refund.status };
};

const verifyWebhookSignature = (rawBody, signature) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !Buffer.isBuffer(rawBody) || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};

module.exports = {
    PaymentGatewayError,
    captureRazorpayPayment,
    createRazorpayOrder,
    createRazorpayRefund,
    fetchRazorpayPayment,
    getConfig,
    verifyCheckoutSignature,
    verifyWebhookSignature
};
