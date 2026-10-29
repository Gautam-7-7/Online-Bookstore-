jest.mock("../src/models/Order", () => ({
    findOne: jest.fn()
}));
jest.mock("../src/models/Coupon", () => ({
    findOne: jest.fn()
}));
jest.mock("../src/models/Book", () => ({
    updateOne: jest.fn()
}));
jest.mock("../src/models/Cart", () => ({}));
jest.mock("../src/models/Review", () => ({}));
jest.mock("../src/models/SellerRating", () => ({}));
jest.mock("../src/services/coupons", () => ({
    findValidCoupon: jest.fn(),
    releaseCouponRedemption: jest.fn(),
    reserveCouponRedemption: jest.fn(),
    roundMoney: (value) => value
}));
jest.mock("../src/services/paymentGateway", () => ({
    captureRazorpayPayment: jest.fn(),
    createRazorpayOrder: jest.fn(),
    createRazorpayRefund: jest.fn(),
    fetchRazorpayPayment: jest.fn(),
    getConfig: jest.fn(),
    PaymentGatewayError: class PaymentGatewayError extends Error {},
    verifyCheckoutSignature: jest.fn(),
    verifyWebhookSignature: jest.fn()
}));
jest.mock("../src/services/ratings", () => ({
    recalculateBookRating: jest.fn(),
    recalculateSellerRating: jest.fn()
}));

const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const { createRazorpayRefund } = require("../src/services/paymentGateway");
const {
    requestCancellation,
    requestReturn
} = require("../src/controllers/commerceController");

const createOrder = (status, deliveredAt) => ({
    _id: new mongoose.Types.ObjectId(),
    buyer: new mongoose.Types.ObjectId(),
    status,
    total: 25,
    currency: "INR",
    trackingHistory: deliveredAt
        ? [{ status: "Delivered", occurredAt: deliveredAt }]
        : [],
    payment: { status: "succeeded", transactionId: "pay_gateway123" },
    returnRequest: {
        type: null,
        status: null,
        refundId: null
    },
    save: jest.fn().mockResolvedValue(undefined)
});

const createResponse = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
};

describe("Order cancellation and return policy", () => {
    const savedWindow = process.env.ORDER_RETURN_WINDOW_DAYS;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ORDER_RETURN_WINDOW_DAYS = "7";
        createRazorpayRefund.mockResolvedValue({
            id: "rfnd_gateway123",
            status: "pending"
        });
    });

    afterAll(() => {
        if (savedWindow === undefined) {
            delete process.env.ORDER_RETURN_WINDOW_DAYS;
        } else {
            process.env.ORDER_RETURN_WINDOW_DAYS = savedWindow;
        }
    });

    test("allows cancellation before shipment and requests an idempotent refund", async () => {
        const order = createOrder("Placed");
        Order.findOne.mockResolvedValue(order);
        const response = createResponse();

        await requestCancellation(
            {
                params: { orderId: order._id.toString() },
                user: { id: order.buyer },
                body: { reason: "Changed my mind" }
            },
            response
        );

        expect(createRazorpayRefund).toHaveBeenCalledWith(
            expect.objectContaining({
                paymentId: "pay_gateway123",
                amount: 2500,
                idempotencyKey: expect.any(String)
            })
        );
        expect(order.returnRequest.type).toBe("cancellation");
        expect(order.returnRequest.status).toBe("refund_pending");
        expect(order.status).toBe("Cancelled");
        expect(response.status).toHaveBeenCalledWith(202);
    });

    test("rejects cancellation after the order has shipped", async () => {
        const order = createOrder("Shipped");
        Order.findOne.mockResolvedValue(order);
        const response = createResponse();

        await requestCancellation(
            {
                params: { orderId: order._id.toString() },
                user: { id: order.buyer },
                body: { reason: "Changed my mind" }
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(409);
        expect(createRazorpayRefund).not.toHaveBeenCalled();
    });

    test("accepts a return within the configured window after delivery", async () => {
        const order = createOrder("Delivered", new Date(Date.now() - 86400000));
        Order.findOne.mockResolvedValue(order);
        const response = createResponse();

        await requestReturn(
            {
                params: { orderId: order._id.toString() },
                user: { id: order.buyer },
                body: { reason: "Item arrived damaged" }
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(202);
        expect(order.returnRequest.returnWindowDays).toBe(7);
        expect(order.status).toBe("Return Requested");
        expect(createRazorpayRefund).toHaveBeenCalledTimes(1);
    });

    test("rejects a return after the configured policy window", async () => {
        const order = createOrder("Delivered", new Date(Date.now() - 8 * 86400000));
        Order.findOne.mockResolvedValue(order);
        const response = createResponse();

        await requestReturn(
            {
                params: { orderId: order._id.toString() },
                user: { id: order.buyer },
                body: { reason: "Too late" }
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json.mock.calls[0][0].message).toContain("7-day");
        expect(createRazorpayRefund).not.toHaveBeenCalled();
    });
});
