jest.mock("../src/models/Order", () => ({
    findById: jest.fn()
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
            save: jest.fn().mockResolvedValue(undefined)
        };
        Order.findById.mockResolvedValue(order);
        const response = createResponse();

        await updateTrackingStatus(
            {
                params: { orderId: order._id.toString() },
                body: { status: "Shipped" }
            },
            response
        );

        expect(order.status).toBe("Shipped");
        expect(order.trackingHistory[1].source).toBe("shipping_partner");
        expect(order.save).toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(200);
    });

    test("rejects skipped stages without changing the order", async () => {
        const order = {
            status: "Placed",
            payment: { status: "succeeded" },
            createdAt: new Date(),
            trackingHistory: [{ status: "Placed", occurredAt: new Date() }],
            save: jest.fn()
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
        expect(order.save).not.toHaveBeenCalled();
    });
});
