jest.mock("../src/models/Order", () => ({
    findById: jest.fn(),
    findOneAndUpdate: jest.fn()
}));

const mongoose = require("mongoose");
const Order = require("../src/models/Order");
const { updateTrackingStatus } = require("../src/controllers/commerceController");

const createResponse = () => {
    const response = {};
    response.status = jest.fn().mockReturnValue(response);
    response.json = jest.fn().mockReturnValue(response);
    return response;
};

describe("Order tracking transitions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("accepts only the next stage and appends tracking history", async () => {
        const order = {
            _id: new mongoose.Types.ObjectId(),
            status: "Placed",
            payment: { status: "succeeded" },
            createdAt: new Date(Date.now() - 60000),
            trackingHistory: [
                { status: "Placed", occurredAt: new Date(Date.now() - 60000) }
            ],
        };
        Order.findById.mockResolvedValue(order);
        const updatedOrder = {
            ...order,
            status: "Shipped",
            trackingHistory: [
                ...order.trackingHistory,
                expect.objectContaining({ status: "Shipped", source: "shipping_partner" })
            ]
        };
        Order.findOneAndUpdate.mockResolvedValue(updatedOrder);
        const response = createResponse();

        await updateTrackingStatus(
            {
                params: { orderId: order._id.toString() },
                body: { status: "Shipped" }
            },
            response
        );

        expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: order._id,
                status: "Placed",
                "payment.status": "succeeded"
            },
            expect.objectContaining({
                $set: { status: "Shipped" },
                $push: {
                    trackingHistory: expect.objectContaining({
                        status: "Shipped",
                        source: "shipping_partner"
                    })
                }
            }),
            { new: true, runValidators: true }
        );
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({ order: updatedOrder });
    });

    test("rejects skipped stages without changing the order", async () => {
        const order = {
            status: "Placed",
            payment: { status: "succeeded" },
            createdAt: new Date(),
            trackingHistory: [{ status: "Placed", occurredAt: new Date() }],
        };
        Order.findById.mockResolvedValue(order);
        const response = createResponse();

        await updateTrackingStatus(
            {
                params: { orderId: new mongoose.Types.ObjectId().toString() },
                body: { status: "Delivered" }
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(409);
        expect(order.status).toBe("Placed");
        expect(Order.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test("rejects out-of-order timestamps without updating the order", async () => {
        const previousTimestamp = new Date(Date.now() - 60_000);
        const order = {
            _id: new mongoose.Types.ObjectId(),
            status: "Placed",
            payment: { status: "succeeded" },
            createdAt: previousTimestamp,
            trackingHistory: [{ status: "Placed", occurredAt: previousTimestamp }]
        };
        Order.findById.mockResolvedValue(order);
        const response = createResponse();

        await updateTrackingStatus(
            {
                params: { orderId: order._id.toString() },
                body: { status: "Shipped", occurredAt: "2020-01-01T00:00:00.000Z" }
            },
            response
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(Order.findOneAndUpdate).not.toHaveBeenCalled();
    });
});
