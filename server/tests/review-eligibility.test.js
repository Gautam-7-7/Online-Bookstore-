jest.mock("../src/models/Order", () => ({
    find: jest.fn()
}));
jest.mock("../src/models/Review", () => ({
    findOne: jest.fn()
}));
jest.mock("../src/models/Book", () => ({}));
jest.mock("../src/models/Cart", () => ({}));
jest.mock("../src/models/Coupon", () => ({}));
jest.mock("../src/models/SellerRating", () => ({}));
jest.mock("../src/services/coupons", () => ({
    findValidCoupon: jest.fn(),
    releaseCouponRedemption: jest.fn(),
    reserveCouponRedemption: jest.fn(),
    roundMoney: (amount) => amount
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
const Review = require("../src/models/Review");
const { getReviewEligibility } = require("../src/controllers/commerceController");

const createResponse = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
};

describe("Verified review eligibility", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("only returns this buyer's delivered paid orders containing the book", async () => {
        const buyerId = new mongoose.Types.ObjectId();
        const bookId = new mongoose.Types.ObjectId();
        const orders = [{ _id: new mongoose.Types.ObjectId() }];
        const query = {
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(orders)
        };
        Review.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });
        Order.find.mockReturnValue(query);
        const response = createResponse();

        await getReviewEligibility(
            {
                params: { bookId: bookId.toString() },
                user: { id: buyerId }
            },
            response
        );

        expect(Review.findOne).toHaveBeenCalledWith({ buyer: buyerId, book: bookId.toString() });
        expect(Order.find).toHaveBeenCalledWith({
            buyer: buyerId,
            status: "Delivered",
            "payment.status": "succeeded",
            "items.book": bookId.toString()
        });
        expect(response.json).toHaveBeenCalledWith({
            hasReviewed: false,
            eligibleOrders: orders
        });
    });

    test("does not offer another review after one has been submitted", async () => {
        const bookId = new mongoose.Types.ObjectId();
        const query = {
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([{ _id: "order-1" }])
        };
        Review.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({ _id: "review-1" })
        });
        Order.find.mockReturnValue(query);
        const response = createResponse();

        await getReviewEligibility(
            {
                params: { bookId: bookId.toString() },
                user: { id: new mongoose.Types.ObjectId() }
            },
            response
        );

        expect(response.json).toHaveBeenCalledWith({
            hasReviewed: true,
            eligibleOrders: []
        });
    });
});
