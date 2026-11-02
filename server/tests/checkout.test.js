jest.mock("../src/models/Book", () => ({
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn()
}));
jest.mock("../src/models/Cart", () => ({
    findOne: jest.fn(),
    updateOne: jest.fn()
}));
jest.mock("../src/models/Coupon", () => ({
    findOne: jest.fn()
}));
jest.mock("../src/models/Order", () => {
    return class MockOrder {
        constructor(values) {
            Object.assign(this, values);
            this._id = "order-123";
            this.trackingHistory = [];
            this.save = jest.fn().mockResolvedValue(this);
        }

        static findOne = jest.fn();
        static findOneAndUpdate = jest.fn();
    };
});
jest.mock("../src/models/Review", () => ({}));
jest.mock("../src/models/SellerRating", () => ({}));
jest.mock("../src/services/coupons", () => ({
    findValidCoupon: jest.fn(),
    releaseCouponRedemption: jest.fn(),
    reserveCouponRedemption: jest.fn(),
    roundMoney: (value) => Math.round((value + Number.EPSILON) * 100) / 100
}));
jest.mock("../src/services/paymentGateway", () => ({
    captureRazorpayPayment: jest.fn(),
    createRazorpayOrder: jest.fn(),
    createRazorpayRefund: jest.fn(),
    fetchRazorpayPayment: jest.fn(),
    getConfig: jest.fn(() => ({ keyId: "rzp_test_123", currency: "INR" })),
    PaymentGatewayError: class PaymentGatewayError extends Error {
        constructor(code, message, status = 502) {
            super(message);
            this.code = code;
            this.status = status;
        }
    },
    verifyCheckoutSignature: jest.fn(),
    verifyWebhookSignature: jest.fn()
}));
jest.mock("../src/services/ratings", () => ({
    recalculateBookRating: jest.fn(),
    recalculateSellerRating: jest.fn()
}));

const Book = require("../src/models/Book");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const {
    createRazorpayOrder,
    PaymentGatewayError
} = require("../src/services/paymentGateway");
const { checkout } = require("../src/controllers/commerceController");

const address = {
    fullName: "Buyer",
    addressLine1: "1 Main Street",
    city: "City",
    state: "State",
    postalCode: "12345",
    country: "IN",
    phone: "1234567890"
};
const cart = {
    updatedAt: new Date(),
    items: [
        {
            book: {
                _id: "507f1f77bcf86cd799439011",
                title: "Test Book",
                seller: "Seller",
                price: 120.5,
                stock: 3,
                isActive: true
            },
            quantity: 2
        }
    ]
};
const response = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("Razorpay checkout order creation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Order.findOne.mockResolvedValue(null);
        Order.findOneAndUpdate.mockResolvedValue({
            stockReserved: true,
            couponReserved: false,
            items: [{ book: "book-123", quantity: 2 }]
        });
        Cart.findOne.mockReturnValue({
            populate: jest.fn().mockResolvedValue(cart)
        });
        Cart.updateOne.mockResolvedValue({});
        Book.findOneAndUpdate.mockResolvedValue({});
        Book.updateOne.mockResolvedValue({});
        createRazorpayOrder.mockResolvedValue({
            keyId: "rzp_test_123",
            gatewayOrderId: "order_gateway123",
            amount: 24100,
            currency: "INR"
        });
    });

    test("creates a provider order for the database-derived total", async () => {
        const res = response();
        const req = {
            user: { id: "buyer-id" },
            body: { shippingAddress: address },
            get: () => "checkout-key-123"
        };

        await checkout(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(createRazorpayOrder).toHaveBeenCalledWith({
            amount: 24100,
            receipt: "order-123",
            notes: { local_order_id: "order-123" }
        });
        expect(res.json.mock.calls[0][0].checkout).toMatchObject({
            keyId: "rzp_test_123",
            orderId: "order_gateway123",
            amount: 24100,
            currency: "INR",
            localOrderId: "order-123"
        });
        expect(res.json.mock.calls[0][0].order.status).toBe("Payment Pending");
        expect(Book.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ stock: { $gte: 2 } }),
            { $inc: { stock: -2 } },
            { new: true }
        );
    });

    test("returns an existing Razorpay order for a retry without reserving stock twice", async () => {
        const existingOrder = {
            _id: "order-existing",
            gatewayOrderId: "order_gateway_existing",
            payment: { status: "pending" },
            total: 45,
            currency: "INR",
            status: "Payment Pending"
        };
        Order.findOne.mockResolvedValue(existingOrder);
        const res = response();

        await checkout(
            {
                user: { id: "buyer-id" },
                body: { shippingAddress: address },
                get: () => "checkout-key-123"
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(createRazorpayOrder).not.toHaveBeenCalled();
        expect(Book.findOneAndUpdate).not.toHaveBeenCalled();
        expect(res.json.mock.calls[0][0].checkout).toMatchObject({
            orderId: "order_gateway_existing",
            amount: 4500
        });
    });

    test("releases checkout reservations when Razorpay order creation fails", async () => {
        createRazorpayOrder.mockRejectedValue(
            new PaymentGatewayError("unavailable", "Razorpay unavailable", 502)
        );
        const res = response();

        await checkout(
            {
                user: { id: "buyer-id" },
                body: { shippingAddress: address },
                get: () => "checkout-key-123"
            },
            res
        );

        expect(res.status).toHaveBeenCalledWith(502);
        expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "Payment Pending",
                "payment.status": "pending"
            }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: "Payment Failed",
                    stockReserved: false
                })
            }),
            { new: false }
        );
        expect(Book.updateOne).toHaveBeenCalledWith(
            { _id: "book-123" },
            { $inc: { stock: 2 } }
        );
    });
});
