const Order = require("../models/Order");

const NEXT_ORDER_STATUS = {
    Placed: "Shipped",
    Shipped: "Out for Delivery",
    "Out for Delivery": "Delivered"
};
const TRACKABLE_STATUSES = Object.values(NEXT_ORDER_STATUS);

const advanceOrderTracking = async ({ orderId, status, occurredAt, source }) => {
    if (!TRACKABLE_STATUSES.includes(status)) {
        return { type: "invalid_status" };
    }

    const order = await Order.findById(orderId);
    if (!order || order.payment.status !== "succeeded") {
        return { type: "not_found" };
    }

    const expectedStatus = NEXT_ORDER_STATUS[order.status];
    if (expectedStatus !== status) {
        return { type: "invalid_transition", expectedStatus };
    }

    const history = order.trackingHistory || [];
    const previousTimestamp =
        history[history.length - 1]?.occurredAt || order.createdAt;
    if (
        occurredAt !== undefined &&
        typeof occurredAt !== "string" &&
        !(occurredAt instanceof Date)
    ) {
        return { type: "invalid_timestamp" };
    }
    const timestamp = occurredAt === undefined ? new Date() : new Date(occurredAt);
    if (
        Number.isNaN(timestamp.getTime()) ||
        timestamp > new Date(Date.now() + 5 * 60 * 1000) ||
        timestamp < previousTimestamp
    ) {
        return { type: "invalid_timestamp" };
    }

    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: order._id,
            status: order.status,
            "payment.status": "succeeded"
        },
        {
            $set: { status },
            $push: {
                trackingHistory: { status, occurredAt: timestamp, source }
            }
        },
        { new: true, runValidators: true }
    );

    return updatedOrder
        ? { type: "updated", order: updatedOrder }
        : { type: "concurrent_update" };
};

module.exports = { advanceOrderTracking, NEXT_ORDER_STATUS };
