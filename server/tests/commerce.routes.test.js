const request = require("supertest");
const app = require("../src/app");

describe("Commerce route authentication", () => {
    const previousSecret = process.env.SHIPPING_WEBHOOK_SECRET;

    afterEach(() => {
        if (previousSecret === undefined) {
            delete process.env.SHIPPING_WEBHOOK_SECRET;
        } else {
            process.env.SHIPPING_WEBHOOK_SECRET = previousSecret;
        }
    });

    test.each([
        ["GET", "/api/cart"],
        ["POST", "/api/cart/items"],
        ["POST", "/api/coupons/validate"],
        ["POST", "/api/orders/checkout"],
        ["GET", "/api/orders"],
        ["POST", "/api/orders/507f1f77bcf86cd799439011/cancellation"],
        ["POST", "/api/orders/507f1f77bcf86cd799439011/return"],
        ["POST", "/api/reviews"],
        ["GET", "/api/reviews/eligibility/507f1f77bcf86cd799439011"],
        ["GET", "/api/books/seller/dashboard"],
        ["GET", "/api/books/mine"],
        ["GET", "/api/books/mine/507f1f77bcf86cd799439011"],
        ["PUT", "/api/books/507f1f77bcf86cd799439011"],
        ["DELETE", "/api/books/507f1f77bcf86cd799439011"]
    ])("%s %s requires authentication", async (method, path) => {
        const response = await request(app)[method.toLowerCase()](path).send({});
        expect(response.statusCode).toBe(401);
    });

    test("shipping status updates fail closed when no webhook secret is configured", async () => {
        delete process.env.SHIPPING_WEBHOOK_SECRET;

        const response = await request(app)
            .post("/api/orders/507f1f77bcf86cd799439011/tracking")
            .send({ status: "Shipped" });

        expect(response.statusCode).toBe(503);
    });

    test("Razorpay webhook rejects missing or invalid signatures", async () => {
        const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
        const response = await request(app)
            .post("/api/payments/razorpay/webhook")
            .set("Content-Type", "application/json")
            .send({ event: "payment.captured" });

        expect(response.statusCode).toBe(401);
        if (previousWebhookSecret !== undefined) {
            process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhookSecret;
        }
    });
});
