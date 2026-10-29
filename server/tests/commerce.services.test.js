jest.mock("../src/models/Coupon");

const crypto = require("crypto");
const Coupon = require("../src/models/Coupon");
const { findValidCoupon } = require("../src/services/coupons");
const {
    captureRazorpayPayment,
    createRazorpayOrder,
    createRazorpayRefund,
    fetchRazorpayPayment,
    getConfig,
    PaymentGatewayError,
    verifyCheckoutSignature,
    verifyWebhookSignature
} = require("../src/services/paymentGateway");

describe("Coupon service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("calculates a percentage discount from the server subtotal", async () => {
        Coupon.findOne.mockResolvedValue({
            code: "SAVE10",
            isActive: true,
            startsAt: new Date(Date.now() - 1000),
            expiresAt: new Date(Date.now() + 60000),
            maxRedemptions: null,
            redemptionCount: 0,
            minimumOrderAmount: 0,
            discountType: "percentage",
            discountValue: 10
        });

        await expect(findValidCoupon("save10", 80)).resolves.toMatchObject({
            discount: 8,
            total: 72
        });
        expect(Coupon.findOne).toHaveBeenCalledWith({ code: "SAVE10" });
    });

    test("caps a fixed discount at the subtotal", async () => {
        Coupon.findOne.mockResolvedValue({
            code: "FREE",
            isActive: true,
            startsAt: new Date(Date.now() - 1000),
            expiresAt: new Date(Date.now() + 60000),
            maxRedemptions: null,
            redemptionCount: 0,
            minimumOrderAmount: 0,
            discountType: "fixed",
            discountValue: 50
        });

        await expect(findValidCoupon("FREE", 20)).resolves.toMatchObject({
            discount: 20,
            total: 0
        });
    });

    test("rejects expired coupon codes", async () => {
        Coupon.findOne.mockResolvedValue({
            isActive: true,
            startsAt: new Date(Date.now() - 60000),
            expiresAt: new Date(Date.now() - 1),
            maxRedemptions: null,
            redemptionCount: 0
        });

        await expect(findValidCoupon("OLD", 20)).resolves.toMatchObject({
            error: expect.stringContaining("invalid")
        });
    });
});

describe("Razorpay gateway integration", () => {
    const savedEnv = {
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
        RAZORPAY_CURRENCY: process.env.RAZORPAY_CURRENCY,
        RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET
    };
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.RAZORPAY_KEY_ID = "rzp_test_123";
        process.env.RAZORPAY_KEY_SECRET = "test-secret";
        process.env.RAZORPAY_CURRENCY = "INR";
        process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
        global.fetch = jest.fn();
    });

    afterAll(() => {
        global.fetch = originalFetch;
        for (const [key, value] of Object.entries(savedEnv)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    test("creates a Razorpay order for a server-calculated amount", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: "order_gateway123",
                status: "created",
                amount: 2550,
                currency: "INR",
                receipt: "local-order-1"
            })
        });

        await expect(
            createRazorpayOrder({
                amount: 2550,
                receipt: "local-order-1",
                notes: { local_order_id: "local-order-1" }
            })
        ).resolves.toEqual({
            keyId: "rzp_test_123",
            gatewayOrderId: "order_gateway123",
            amount: 2550,
            currency: "INR"
        });
        expect(global.fetch.mock.calls[0][0]).toBe(
            "https://api.razorpay.com/v1/orders"
        );
        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe(
            `Basic ${Buffer.from("rzp_test_123:test-secret").toString("base64")}`
        );
        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
            amount: 2550,
            currency: "INR",
            receipt: "local-order-1",
            notes: { local_order_id: "local-order-1" },
            partial_payment: false
        });
    });

    test("verifies Razorpay Checkout signatures", () => {
        const gatewayOrderId = "order_gateway123";
        const paymentId = "pay_gateway123";
        const signature = crypto
            .createHmac("sha256", "test-secret")
            .update(`${gatewayOrderId}|${paymentId}`)
            .digest("hex");

        expect(
            verifyCheckoutSignature({ gatewayOrderId, paymentId, signature })
        ).toBe(true);
        expect(
            verifyCheckoutSignature({
                gatewayOrderId,
                paymentId,
                signature: "0".repeat(64)
            })
        ).toBe(false);
    });

    test("rejects currencies that do not match the bookstore's INR price units", () => {
        process.env.RAZORPAY_CURRENCY = "USD";

        expect(() => getConfig()).toThrow(PaymentGatewayError);

        process.env.RAZORPAY_CURRENCY = "INR";
    });

    test("fetches authorized payment details and captures the exact amount", async () => {
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: "pay_gateway123",
                    order_id: "order_gateway123",
                    amount: 2550,
                    currency: "INR",
                    status: "authorized"
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ status: "captured" })
            });

        await expect(fetchRazorpayPayment("pay_gateway123")).resolves.toMatchObject({
            status: "authorized",
            amount: 2550
        });
        await captureRazorpayPayment({
            paymentId: "pay_gateway123",
            amount: 2550
        });
        expect(global.fetch.mock.calls[1][0]).toBe(
            "https://api.razorpay.com/v1/payments/pay_gateway123/capture"
        );
        expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
            amount: 2550,
            currency: "INR"
        });
    });

    test("creates an idempotent Razorpay refund", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: "rfnd_gateway123",
                payment_id: "pay_gateway123",
                amount: 2550,
                currency: "INR",
                status: "pending"
            })
        });

        await expect(
            createRazorpayRefund({
                paymentId: "pay_gateway123",
                amount: 2550,
                idempotencyKey: "refund-key-123456789",
                receipt: "rf_local-order"
            })
        ).resolves.toEqual({ id: "rfnd_gateway123", status: "pending" });
        expect(global.fetch.mock.calls[0][1].headers["X-Refund-Idempotency"]).toBe(
            "refund-key-123456789"
        );
    });

    test("verifies webhook signatures over raw request bytes", () => {
        const body = Buffer.from('{"event":"payment.captured"}');
        const signature = crypto
            .createHmac("sha256", "webhook-secret")
            .update(body)
            .digest("hex");

        expect(verifyWebhookSignature(body, signature)).toBe(true);
        expect(verifyWebhookSignature(body, "a".repeat(64))).toBe(false);
    });

    test("fails closed when Razorpay credentials are missing", async () => {
        delete process.env.RAZORPAY_KEY_SECRET;

        await expect(
            createRazorpayOrder({ amount: 100, receipt: "order-1" })
        ).rejects.toBeInstanceOf(PaymentGatewayError);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
