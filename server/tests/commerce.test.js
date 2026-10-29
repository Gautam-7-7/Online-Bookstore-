const mongoose = require("mongoose");
const Cart = require("../src/models/Cart");
const Coupon = require("../src/models/Coupon");
const Order = require("../src/models/Order");
const Review = require("../src/models/Review");
const {
    calculateCartSubtotal,
    checkout,
    hasRawPaymentData,
    validateShippingAddress
} = require("../src/controllers/commerceController");

const createResponse = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
};

describe("Commerce model validation", () => {
    test("cart requires a user and positive item quantities", () => {
        const cart = new Cart({
            user: new mongoose.Types.ObjectId(),
            items: [{ book: new mongoose.Types.ObjectId(), quantity: 0 }]
        });

        expect(cart.validateSync().errors["items.0.quantity"]).toBeDefined();
    });

    test("coupon percentage discounts cannot exceed 100 percent", () => {
        const coupon = new Coupon({
            code: "TOOMUCH",
            discountType: "percentage",
            discountValue: 101,
            expiresAt: new Date(Date.now() + 86400000)
        });

        expect(coupon.validateSync().errors.discountValue).toBeDefined();
    });

    test("order contains no raw card or CVV persistence fields", () => {
        expect(Order.schema.path("payment.cardNumber")).toBeUndefined();
        expect(Order.schema.path("payment.cvv")).toBeUndefined();
        expect(Order.schema.path("payment.transactionId")).toBeDefined();
        expect(Order.schema.path("payment.last4")).toBeDefined();
    });

    test("review ratings are limited to integer stars from one through five", () => {
        const review = new Review({
            buyer: new mongoose.Types.ObjectId(),
            order: new mongoose.Types.ObjectId(),
            book: new mongoose.Types.ObjectId(),
            seller: "Seller",
            rating: 5.5,
            text: "Good"
        });

        expect(review.validateSync().errors.rating).toBeDefined();
    });
});

describe("Commerce validation helpers", () => {
    const savedRazorpayConfig = {
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
    };

    beforeEach(() => {
        process.env.RAZORPAY_KEY_ID = "rzp_test_123";
        process.env.RAZORPAY_KEY_SECRET = "test-secret";
    });

    afterAll(() => {
        for (const [key, value] of Object.entries(savedRazorpayConfig)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    test("cart subtotal uses current book prices and quantities", () => {
        expect(
            calculateCartSubtotal([
                { book: { price: 12.5, stock: 3, isActive: true }, quantity: 2 },
                { book: { price: 7, stock: 4, isActive: true }, quantity: 1 }
            ])
        ).toBe(32);
    });

    test("cart subtotal rejects inactive or insufficient stock", () => {
        expect(() =>
            calculateCartSubtotal([
                { book: { price: 10, stock: 1, isActive: true }, quantity: 2 }
            ])
        ).toThrow("no longer available");
    });

    test("raw card details are rejected even when nested", () => {
        expect(hasRawPaymentData({ payment: { card_number: "4111111111111111" } })).toBe(true);
        expect(hasRawPaymentData({ paymentToken: "provider-token" })).toBe(false);
    });

    test("shipping address validation trims fields and rejects missing required data", () => {
        const address = validateShippingAddress({
            fullName: "  Buyer  ",
            addressLine1: "  1 Main St ",
            city: "City",
            state: "State",
            postalCode: "12345",
            country: "IN",
            phone: "1234567890"
        });

        expect(address.fullName).toBe("Buyer");
        expect(address.addressLine2).toBe("");
        expect(validateShippingAddress({ fullName: "Buyer" })).toBeNull();
    });

    test("checkout rejects raw card details before persistence", async () => {
        const response = createResponse();
        await checkout(
            { body: { cardNumber: "4111111111111111", cvv: "123" } },
            response
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json.mock.calls[0][0].message).toContain("payment provider");
    });

    test("checkout requires a retry-safe idempotency key", async () => {
        const response = createResponse();
        await checkout(
            {
                body: {
                    shippingAddress: {
                        fullName: "Buyer",
                        addressLine1: "1 Main St",
                        city: "City",
                        state: "State",
                        postalCode: "12345",
                        country: "IN",
                        phone: "1234567890"
                    }
                },
                get: () => ""
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json.mock.calls[0][0].message).toContain("Idempotency-Key");
    });
});
