const crypto = require("crypto");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const Cart = require("../models/Cart");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Review = require("../models/Review");
const SellerRating = require("../models/SellerRating");
const {
    findValidCoupon,
    releaseCouponRedemption,
    reserveCouponRedemption,
    roundMoney
} = require("../services/coupons");
const {
    captureRazorpayPayment,
    createRazorpayOrder,
    createRazorpayRefund,
    fetchRazorpayPayment,
    getConfig,
    PaymentGatewayError,
    verifyCheckoutSignature,
    verifyWebhookSignature
} = require("../services/paymentGateway");
const {
    recalculateBookRating,
    recalculateSellerRating
} = require("../services/ratings");

const POPULATED_CART_FIELDS =
    "title author isbn price seller sellerId coverImage stock isActive";
const NEXT_ORDER_STATUS = {
    Placed: "Shipped",
    Shipped: "Out for Delivery",
    "Out for Delivery": "Delivered"
};
const RAW_PAYMENT_FIELDS = new Set([
    "card",
    "creditcard",
    "debitcard",
    "cardnumber",
    "primaryaccountnumber",
    "pan",
    "cvv",
    "cvc",
    "securitycode",
    "expiry",
    "expiration",
    "expirationdate",
    "expirymonth",
    "expiryyear"
]);
const isValidObjectId = (value) =>
    typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
const containsCardNumber = (value) =>
    typeof value === "string" && /\d(?:[\s-]*\d){12,18}/.test(value);

const hasRawPaymentData = (value) => {
    if (!value || typeof value !== "object") {
        return false;
    }

    return Object.entries(value).some(
        ([key, nestedValue]) =>
            RAW_PAYMENT_FIELDS.has(key.replace(/[^a-z]/gi, "").toLowerCase()) ||
            (nestedValue && typeof nestedValue === "object" && hasRawPaymentData(nestedValue))
    );
};

const calculateCartSubtotal = (items) =>
    roundMoney(
        items.reduce((total, item) => {
            const book = item.book;
            if (!book || !book.isActive || book.stock < item.quantity) {
                throw new Error("A cart item is no longer available in the requested quantity");
            }
            return total + book.price * item.quantity;
        }, 0)
    );

const getPopulatedCart = async (userId) =>
    Cart.findOne({ user: userId }).populate("items.book", POPULATED_CART_FIELDS);

const cartResponse = (cart) => {
    const items = (cart?.items || []).map((item) => ({
        book: item.book,
        quantity: item.quantity,
        lineTotal: roundMoney(item.book.price * item.quantity)
    }));
    return {
        cart: { id: cart?._id || null, items },
        subtotal: roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0))
    };
};

const getCart = async (req, res) => {
    try {
        const cart = await getPopulatedCart(req.user.id);
        return res.status(200).json(cartResponse(cart));
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve cart" });
    }
};

const addCartItem = async (req, res) => {
    try {
        const { bookId, quantity = 1 } = req.body || {};
        if (
            !isValidObjectId(bookId) ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                message: "A valid bookId and quantity from 1 to 99 are required"
            });
        }

        const book = await Book.findOne({ _id: bookId, isActive: true });
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }

        const existing = cart.items.find(
            (item) => item.book.toString() === book._id.toString()
        );
        const updatedQuantity = (existing?.quantity || 0) + quantity;
        if (updatedQuantity > book.stock) {
            return res.status(409).json({
                message: "Requested quantity exceeds available stock"
            });
        }

        if (existing) {
            existing.quantity = updatedQuantity;
        } else {
            cart.items.push({ book: book._id, quantity });
        }
        await cart.save();

        const populatedCart = await getPopulatedCart(req.user.id);
        return res.status(200).json(cartResponse(populatedCart));
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Cart changed concurrently. Please retry the request"
            });
        }
        return res.status(500).json({ message: "Failed to update cart" });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!isValidObjectId(bookId)) {
            return res.status(400).json({ message: "Invalid book ID" });
        }

        const normalizedBookId = bookId.toLowerCase();
        const cart = await Cart.findOne({ user: req.user.id });
        if (cart) {
            cart.items = cart.items.filter(
                (item) => item.book.toString() !== normalizedBookId
            );
            await cart.save();
        }

        return res.status(200).json(cartResponse(await getPopulatedCart(req.user.id)));
    } catch (error) {
        return res.status(500).json({ message: "Failed to remove cart item" });
    }
};

const clearCart = async (req, res) => {
    try {
        await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
        return res.status(200).json({ message: "Cart cleared", cart: { items: [] }, subtotal: 0 });
    } catch (error) {
        return res.status(500).json({ message: "Failed to clear cart" });
    }
};

const validateCoupon = async (req, res) => {
    try {
        const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
        if (!code || code.length > 32) {
            return res.status(400).json({ message: "A valid coupon code is required" });
        }

        const cart = await getPopulatedCart(req.user.id);
        if (!cart?.items.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        let subtotal;
        try {
            subtotal = calculateCartSubtotal(cart.items);
        } catch (error) {
            return res.status(409).json({ message: error.message });
        }

        const result = await findValidCoupon(code, subtotal);
        if (result.error) {
            return res.status(400).json({ message: result.error });
        }

        return res.status(200).json({
            code: result.coupon.code,
            subtotal,
            discount: result.discount,
            total: result.total
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to validate coupon" });
    }
};

const validateShippingAddress = (address) => {
    if (!address || typeof address !== "object" || Array.isArray(address)) {
        return null;
    }
    const required = ["fullName", "addressLine1", "city", "state", "postalCode", "country", "phone"];
    const normalized = {};

    for (const field of required) {
        if (
            typeof address[field] !== "string" ||
            !address[field].trim() ||
            address[field].trim().length > 160
        ) {
            return null;
        }
        normalized[field] = address[field].trim();
    }

    if (
        address.addressLine2 !== undefined &&
        (typeof address.addressLine2 !== "string" || address.addressLine2.length > 160)
    ) {
        return null;
    }
    normalized.addressLine2 = address.addressLine2?.trim() || "";
    return normalized;
};

const checkoutOptions = (order, keyId, currency) => ({
    keyId,
    orderId: order.gatewayOrderId,
    amount: Math.round(order.total * 100),
    currency,
    localOrderId: order._id,
    name: "Online Bookstore",
    description: `Book order ${order._id}`
});

const clearPurchasedCart = async (order) => {
    const filter = { user: order.buyer };
    if (order.cartUpdatedAt) {
        filter.updatedAt = order.cartUpdatedAt;
    }
    await Cart.updateOne(filter, { $set: { items: [] } });
};

const settlePaidOrder = async (order, payment) => {
    const updated = await Order.findOneAndUpdate(
        {
            _id: order._id,
            gatewayOrderId: payment.order_id,
            status: "Payment Pending",
            "payment.status": "pending"
        },
        {
            $set: {
                status: "Placed",
                "payment.provider": "razorpay",
                "payment.transactionId": payment.id,
                "payment.status": "succeeded",
                "payment.brand": payment.card?.network || payment.method || null,
                "payment.last4": /^\d{4}$/.test(payment.card?.last4 || "")
                    ? payment.card.last4
                    : null,
                stockReserved: false,
                couponReserved: false
            },
            $push: {
                trackingHistory: {
                    status: "Placed",
                    occurredAt: new Date(),
                    source: "razorpay"
                }
            }
        },
        { new: true, runValidators: true }
    );

    if (updated) {
        await clearPurchasedCart(updated);
        return updated;
    }

    const current = await Order.findById(order._id);
    if (current?.payment.status === "succeeded") {
        await clearPurchasedCart(current);
        return current;
    }
    return null;
};

const failPendingOrder = async (order) => {
    const previous = await Order.findOneAndUpdate(
        {
            _id: order._id,
            status: "Payment Pending",
            "payment.status": "pending"
        },
        {
            $set: {
                status: "Payment Failed",
                "payment.status": "failed",
                stockReserved: false,
                couponReserved: false
            }
        },
        { new: false }
    );

    if (!previous) {
        return;
    }
    if (previous.stockReserved) {
        await releaseStock(
            previous.items.map(({ book, quantity }) => ({ book, quantity }))
        );
    }
    if (previous.couponReserved && previous.coupon?.code) {
        const coupon = await Coupon.findOne({ code: previous.coupon.code });
        await releaseCouponRedemption(coupon);
    }
};

const processRefundWebhook = async (refund) => {
    if (
        !refund ||
        typeof refund.payment_id !== "string" ||
        typeof refund.id !== "string" ||
        !["processed", "failed", "pending"].includes(refund.status)
    ) {
        return;
    }
    const order = await Order.findOne({ "payment.transactionId": refund.payment_id });
    if (
        !order ||
        !order.returnRequest ||
        !order.returnRequest.type ||
        refund.receipt !== `rf_${order._id.toString().slice(-20)}` ||
        refund.amount !== Math.round(order.total * 100) ||
        refund.currency !== order.currency ||
        (order.returnRequest.refundId &&
            order.returnRequest.refundId !== refund.id)
    ) {
        return;
    }

    order.returnRequest.refundId = refund.id;
    if (refund.status === "processed") {
        order.returnRequest.status = "refunded";
        order.payment.status = "refunded";
        order.status =
            order.returnRequest.type === "cancellation" ? "Cancelled" : "Returned";
    } else if (refund.status === "failed") {
        order.returnRequest.status = "refund_failed";
    } else {
        order.returnRequest.status = "refund_pending";
    }
    await order.save();
};

const reserveStock = async (items) => {
    const reserved = [];
    try {
        for (const item of items) {
            const book = await Book.findOneAndUpdate(
                {
                    _id: item.book,
                    isActive: true,
                    stock: { $gte: item.quantity }
                },
                { $inc: { stock: -item.quantity } },
                { new: true }
            );
            if (!book) {
                await releaseStock(reserved);
                return false;
            }
            reserved.push(item);
        }
        return true;
    } catch (error) {
        if (reserved.length) {
            await releaseStock(reserved);
        }
        throw error;
    }
};

const releaseStock = async (items) => {
    await Promise.all(
        items.map((item) =>
            Book.updateOne({ _id: item.book }, { $inc: { stock: item.quantity } })
        )
    );
};

const checkout = async (req, res) => {
    let reservedItems = [];
    let reservedCoupon = null;
    let order;
    try {
        const gateway = getConfig();
        const body = req.body || {};
        if (hasRawPaymentData(body)) {
            return res.status(400).json({
                message: "Card numbers, CVV, and expiry details must be entered only in the payment provider"
            });
        }

        const shippingAddress = validateShippingAddress(body.shippingAddress);
        if (!shippingAddress) {
            return res.status(400).json({
                message: "A valid shippingAddress is required"
            });
        }

        const idempotencyKey = req.get("idempotency-key") || "";
        if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
            return res.status(400).json({
                message: "A unique Idempotency-Key header of 8 to 128 safe characters is required"
            });
        }

        order = await Order.findOne({ buyer: req.user.id, idempotencyKey });
        if (order?.payment.status === "succeeded") {
            await clearPurchasedCart(order);
            return res.status(200).json({
                message: "Order already placed for this checkout request",
                order
            });
        }
        if (order?.payment.status === "failed") {
            return res.status(409).json({
                message: "This checkout request already failed; use a new Idempotency-Key to retry"
            });
        }

        if (!order) {
            const cart = await getPopulatedCart(req.user.id);
            if (!cart?.items.length) {
                return res.status(400).json({ message: "Cart is empty" });
            }

            let subtotal;
            try {
                subtotal = calculateCartSubtotal(cart.items);
            } catch (error) {
                return res.status(409).json({ message: error.message });
            }

            let couponData = null;
            if (body.couponCode !== undefined) {
                if (typeof body.couponCode !== "string" || body.couponCode.length > 32) {
                    return res.status(400).json({ message: "Invalid coupon code" });
                }
                couponData = await findValidCoupon(body.couponCode, subtotal);
                if (couponData.error) {
                    return res.status(400).json({ message: couponData.error });
                }
            }

            const discount = couponData?.discount || 0;
            const total = roundMoney(subtotal - discount);
            if (total < 1) {
                return res.status(400).json({
                    message: "Razorpay requires a payment total of at least INR 1.00"
                });
            }
            const orderItems = cart.items.map((item) => ({
                book: item.book._id,
                title: item.book.title,
                seller: item.book.seller,
                sellerId: item.book.sellerId || null,
                quantity: item.quantity,
                unitPrice: item.book.price
            }));
            const stockItems = orderItems.map(({ book, quantity }) => ({ book, quantity }));

            order = new Order({
                buyer: req.user.id,
                idempotencyKey,
                items: orderItems,
                subtotal,
                discount,
                total,
                coupon: couponData
                    ? {
                          code: couponData.coupon.code,
                          discountType: couponData.coupon.discountType,
                          discountValue: couponData.coupon.discountValue
                      }
                    : undefined,
                shippingAddress,
                payment: { provider: "razorpay", status: "pending" },
                status: "Payment Pending",
                cartUpdatedAt: cart.updatedAt || null,
                currency: gateway.currency
            });
            await order.save();
        }

        if (order.gatewayOrderId) {
            return res.status(200).json({
                message: "Razorpay checkout order is ready",
                order,
                checkout: checkoutOptions(order, gateway.keyId, gateway.currency)
            });
        }

        if (!order.stockReserved) {
            const stockItems = order.items.map(({ book, quantity }) => ({ book, quantity }));
            const stockReserved = await reserveStock(stockItems);
            if (!stockReserved) {
                order.payment.status = "failed";
                order.status = "Payment Failed";
                await order.save();
                return res.status(409).json({
                    message: "One or more books are no longer available in the requested quantity"
                });
            }
            reservedItems = stockItems;
            order.stockReserved = true;
            await order.save();
        }

        if (order.coupon?.code && !order.couponReserved) {
            reservedCoupon = await Coupon.findOne({ code: order.coupon.code });
            if (!reservedCoupon || !(await reserveCouponRedemption(reservedCoupon))) {
                await releaseStock(reservedItems);
                reservedItems = [];
                order.stockReserved = false;
                order.payment.status = "failed";
                order.status = "Payment Failed";
                await order.save();
                return res.status(409).json({
                    message: "Coupon is no longer available"
                });
            }
            order.couponReserved = true;
            await order.save();
        }

        const razorpayOrder = await createRazorpayOrder({
            amount: Math.round(order.total * 100),
            receipt: order._id.toString(),
            notes: { local_order_id: order._id.toString() }
        });
        order.gatewayOrderId = razorpayOrder.gatewayOrderId;
        order.payment.provider = "razorpay";
        try {
            await order.save();
        } catch {
            try {
                await failPendingOrder(order);
            } catch {
                return res.status(503).json({
                    message: "Razorpay order persistence failed and inventory reservation cleanup needs reconciliation",
                    orderId: order._id
                });
            }
            return res.status(503).json({
                message: "Razorpay order was created but could not be saved; start a new checkout attempt",
                orderId: order._id
            });
        }

        return res.status(201).json({
            message: "Razorpay checkout order created; payment confirmation is still required",
            order,
            checkout: checkoutOptions(order, razorpayOrder.keyId, razorpayOrder.currency)
        });
    } catch (error) {
        if (order && order.payment.status === "pending") {
            try {
                await failPendingOrder(order);
                reservedItems = [];
                reservedCoupon = null;
            } catch {
                return res.status(503).json({
                    message: "Razorpay order setup failed and inventory reservation cleanup needs reconciliation",
                    orderId: order._id
                });
            }
        }
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This checkout request is already being processed"
            });
        }
        if (error instanceof PaymentGatewayError) {
            return res.status(error.status).json({
                message: error.message,
                ...(order ? { orderId: order._id } : {})
            });
        }
        return res.status(500).json({ message: "Checkout could not be completed" });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const {
            razorpay_payment_id: paymentId,
            razorpay_order_id: gatewayOrderId,
            razorpay_signature: signature
        } = req.body || {};
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findOne({
            _id: orderId.toLowerCase(),
            buyer: req.user.id
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.payment.status === "succeeded") {
            await clearPurchasedCart(order);
            return res.status(200).json({ message: "Payment already confirmed", order });
        }
        if (order.payment.status !== "pending" || order.gatewayOrderId !== gatewayOrderId) {
            return res.status(409).json({ message: "Payment does not match this order" });
        }
        if (!verifyCheckoutSignature({ gatewayOrderId, paymentId, signature })) {
            return res.status(400).json({ message: "Invalid Razorpay payment signature" });
        }

        let payment = await fetchRazorpayPayment(paymentId);
        if (
            payment.order_id !== order.gatewayOrderId ||
            payment.amount !== Math.round(order.total * 100) ||
            payment.currency !== order.currency
        ) {
            return res.status(400).json({
                message: "Razorpay payment details do not match this order"
            });
        }

        if (payment.status === "failed") {
            await failPendingOrder(order);
            return res.status(402).json({ message: "Payment failed", orderId: order._id });
        }
        if (payment.status === "authorized") {
            await captureRazorpayPayment({
                paymentId,
                amount: Math.round(order.total * 100)
            });
            payment = await fetchRazorpayPayment(paymentId);
        }
        if (payment.status !== "captured") {
            return res.status(202).json({
                message: "Payment is not captured yet; order remains unconfirmed",
                orderId: order._id
            });
        }

        const settledOrder = await settlePaidOrder(order, payment);
        if (!settledOrder) {
            return res.status(409).json({
                message: "Payment was captured, but order settlement is pending webhook reconciliation",
                orderId: order._id
            });
        }
        return res.status(200).json({
            message: "Payment verified and order confirmed",
            order: settledOrder
        });
    } catch (error) {
        if (error instanceof PaymentGatewayError) {
            return res.status(error.status).json({ message: error.message });
        }
        return res.status(500).json({ message: "Failed to verify Razorpay payment" });
    }
};

const reportRazorpayFailure = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const { razorpay_order_id: gatewayOrderId, razorpay_payment_id: paymentId } =
            req.body || {};
        const order = await Order.findOne({
            _id: req.params.orderId.toLowerCase(),
            buyer: req.user.id
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.payment.status === "failed") {
            return res.status(200).json({ message: "Payment failure already recorded", order });
        }
        if (
            order.payment.status !== "pending" ||
            order.gatewayOrderId !== gatewayOrderId ||
            typeof paymentId !== "string"
        ) {
            return res.status(409).json({ message: "Payment does not match this order" });
        }

        const payment = await fetchRazorpayPayment(paymentId);
        if (
            payment.order_id !== order.gatewayOrderId ||
            payment.status !== "failed" ||
            payment.amount !== Math.round(order.total * 100) ||
            payment.currency !== order.currency
        ) {
            return res.status(409).json({
                message: "Razorpay has not confirmed a failed payment for this order"
            });
        }
        await failPendingOrder(order);
        const updatedOrder = await Order.findById(order._id);
        return res.status(200).json({
            message: "Failed payment recorded; cart contents are unchanged",
            order: updatedOrder
        });
    } catch (error) {
        if (error instanceof PaymentGatewayError) {
            return res.status(error.status).json({ message: error.message });
        }
        return res.status(500).json({ message: "Failed to verify payment failure" });
    }
};

const razorpayWebhook = async (req, res) => {
    if (!verifyWebhookSignature(req.body, req.get("x-razorpay-signature"))) {
        return res.status(401).json({ message: "Invalid Razorpay webhook signature" });
    }

    let event;
    try {
        event = JSON.parse(req.body.toString("utf8"));
    } catch {
        return res.status(400).json({ message: "Invalid Razorpay webhook payload" });
    }
    if (!event || typeof event.event !== "string" || !event.payload) {
        return res.status(400).json({ message: "Invalid Razorpay webhook event" });
    }

    try {
        if (event.event.startsWith("refund.")) {
            await processRefundWebhook(event.payload.refund?.entity);
            return res.status(200).json({ received: true });
        }

        const payment = event.payload.payment?.entity;
        const gatewayOrderId =
            payment?.order_id || event.payload.order?.entity?.id;
        if (!gatewayOrderId || !payment) {
            return res.status(200).json({ received: true });
        }

        const order = await Order.findOne({ gatewayOrderId });
        if (!order) {
            return res.status(200).json({ received: true });
        }

        const eventId = req.get("x-razorpay-event-id");
        if (eventId && order.webhookEventIds.includes(eventId)) {
            return res.status(200).json({ received: true, duplicate: true });
        }

        if (
            ["payment.captured", "order.paid"].includes(event.event) &&
            payment.order_id === order.gatewayOrderId &&
            ["captured", "authorized"].includes(payment.status) &&
            payment.amount === Math.round(order.total * 100) &&
            payment.currency === order.currency
        ) {
            const settledOrder = await settlePaidOrder(order, payment);
            if (!settledOrder) {
                return res.status(409).json({
                    message: "Payment webhook could not settle the order"
                });
            }
        } else if (
            event.event === "payment.failed" &&
            payment.order_id === order.gatewayOrderId &&
            payment.status === "failed" &&
            payment.amount === Math.round(order.total * 100) &&
            payment.currency === order.currency
        ) {
            await failPendingOrder(order);
        }

        if (eventId && eventId.length <= 128) {
            await Order.updateOne(
                { _id: order._id },
                { $push: { webhookEventIds: { $each: [eventId], $slice: -100 } } }
            );
        }
        return res.status(200).json({ received: true });
    } catch {
        return res.status(500).json({ message: "Failed to process Razorpay webhook" });
    }
};

const requestOrderRefund = async (req, res, requestType) => {
    try {
        if (!isValidObjectId(req.params.orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const reason =
            typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
        if (!reason || reason.length > 500) {
            return res.status(400).json({
                message: "A reason of 1 to 500 characters is required"
            });
        }

        const order = await Order.findOne({
            _id: req.params.orderId.toLowerCase(),
            buyer: req.user.id
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.payment.status !== "succeeded" || !order.payment.transactionId) {
            return res.status(409).json({
                message: "Only successfully paid orders can be cancelled or returned"
            });
        }

        const configuredWindow = Number(process.env.ORDER_RETURN_WINDOW_DAYS || 7);
        if (!Number.isSafeInteger(configuredWindow) || configuredWindow < 1 || configuredWindow > 30) {
            return res.status(503).json({
                message: "Order return window configuration must be from 1 to 30 days"
            });
        }

        if (order.returnRequest?.type && order.returnRequest.type !== requestType) {
            return res.status(409).json({
                message: "A different cancellation or return request already exists"
            });
        }
        if (
            order.returnRequest?.status === "refunded" ||
            order.payment.status === "refunded"
        ) {
            return res.status(200).json({
                message: "This order has already been refunded",
                order
            });
        }
        if (order.returnRequest?.status === "refund_failed") {
            return res.status(409).json({
                message: "The previous refund failed; contact support before retrying"
            });
        }

        if (!order.returnRequest?.type) {
            if (requestType === "cancellation" && order.status !== "Placed") {
                return res.status(409).json({
                    message: "Orders can only be cancelled before they are shipped"
                });
            }
            if (requestType === "return") {
                const deliveredAt = [...order.trackingHistory]
                    .reverse()
                    .find((entry) => entry.status === "Delivered")?.occurredAt;
                if (order.status !== "Delivered" || !deliveredAt) {
                    return res.status(409).json({
                        message: "Only delivered orders can be returned"
                    });
                }
                const expiresAt =
                    deliveredAt.getTime() + configuredWindow * 24 * 60 * 60 * 1000;
                if (Date.now() > expiresAt) {
                    return res.status(400).json({
                        message: `The ${configuredWindow}-day return window has expired`
                    });
                }
            }

            order.returnRequest = {
                type: requestType,
                status: "refund_pending",
                reason,
                requestedAt: new Date(),
                returnWindowDays: requestType === "return" ? configuredWindow : null,
                refundId: null
            };
            if (requestType === "cancellation") {
                order.status = "Cancelled";
            } else {
                order.status = "Return Requested";
            }
            await order.save();
        }

        if (order.returnRequest.refundId) {
            return res.status(200).json({
                message: "Refund request is already being processed",
                order
            });
        }

        const refundKey = crypto
            .createHash("sha256")
            .update(`${order._id}:${requestType}`)
            .digest("hex")
            .slice(0, 32);
        const refund = await createRazorpayRefund({
            paymentId: order.payment.transactionId,
            amount: Math.round(order.total * 100),
            idempotencyKey: refundKey,
            receipt: `rf_${order._id.toString().slice(-20)}`
        });

        order.returnRequest.refundId = refund.id;
        order.returnRequest.status =
            refund.status === "processed" ? "refunded" : "refund_pending";
        order.payment.status =
            refund.status === "processed" ? "refunded" : "succeeded";
        if (refund.status === "processed") {
            order.status = requestType === "cancellation" ? "Cancelled" : "Returned";
        }
        await order.save();
        return res.status(202).json({
            message:
                refund.status === "processed"
                    ? "Refund processed"
                    : "Refund requested and is being processed",
            order
        });
    } catch (error) {
        if (error instanceof PaymentGatewayError) {
            return res.status(error.status).json({
                message: error.message,
                retryWithSameRequest: true
            });
        }
        return res.status(500).json({ message: "Failed to process cancellation or return" });
    }
};

const requestCancellation = (req, res) =>
    requestOrderRefund(req, res, "cancellation");

const requestReturn = (req, res) =>
    requestOrderRefund(req, res, "return");

const listOrders = async (req, res) => {
    try {
        const orders = await Order.find({ buyer: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ orders });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve orders" });
    }
};

const getOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await Order.findOne({
            _id: orderId.toLowerCase(),
            buyer: req.user.id
        });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.status(200).json({ order });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve order" });
    }
};

const updateTrackingStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, occurredAt } = req.body || {};
        if (
            !isValidObjectId(orderId) ||
            !["Shipped", "Out for Delivery", "Delivered"].includes(status)
        ) {
            return res.status(400).json({ message: "Invalid order ID or tracking status" });
        }

        const order = await Order.findById(orderId.toLowerCase());
        if (!order || order.payment.status !== "succeeded") {
            return res.status(404).json({ message: "Confirmed order not found" });
        }

        if (NEXT_ORDER_STATUS[order.status] !== status) {
            return res.status(409).json({
                message: `Order status must advance from ${order.status} to ${NEXT_ORDER_STATUS[order.status] || "no further stage"}`
            });
        }

        const previousTimestamp =
            order.trackingHistory[order.trackingHistory.length - 1]?.occurredAt ||
            order.createdAt;
        const timestamp = occurredAt === undefined ? new Date() : new Date(occurredAt);
        if (
            Number.isNaN(timestamp.getTime()) ||
            timestamp > new Date(Date.now() + 5 * 60 * 1000) ||
            timestamp < previousTimestamp
        ) {
            return res.status(400).json({ message: "Invalid tracking event timestamp" });
        }

        order.status = status;
        order.trackingHistory.push({
            status,
            occurredAt: timestamp,
            source: "shipping_partner"
        });
        await order.save();
        return res.status(200).json({ order });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update order tracking" });
    }
};

const submitReview = async (req, res) => {
    try {
        const { orderId, bookId, rating, text } = req.body || {};
        if (
            !isValidObjectId(orderId) ||
            !isValidObjectId(bookId) ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5 ||
            typeof text !== "string" ||
            !text.trim() ||
            text.trim().length > 2000
        ) {
            return res.status(400).json({
                message: "Valid orderId, bookId, 1-5 star rating, and review text are required"
            });
        }

        const normalizedOrderId = orderId.toLowerCase();
        const normalizedBookId = bookId.toLowerCase();
        const order = await Order.findOne({
            _id: normalizedOrderId,
            buyer: req.user.id,
            status: "Delivered",
            "payment.status": "succeeded",
            "items.book": normalizedBookId
        });
        if (!order) {
            return res.status(403).json({
                message: "A delivered purchase is required before reviewing this book"
            });
        }

        const orderItem = order.items.find(
            (item) => item.book.toString() === normalizedBookId
        );
        const review = await Review.create({
            buyer: req.user.id,
            order: order._id,
            book: normalizedBookId,
            seller: orderItem.seller,
            rating,
            text: text.trim()
        });

        const [bookRating, sellerRating] = await Promise.all([
            recalculateBookRating(normalizedBookId),
            recalculateSellerRating(orderItem.seller)
        ]);
        return res.status(201).json({ review, bookRating, sellerRating });
    } catch (error) {
        if (error.code === 11000) {
            const bookId = req.body?.bookId;
            if (!isValidObjectId(bookId)) {
                return res.status(409).json({ message: "You have already reviewed this book" });
            }
            try {
                const existingReview = await Review.findOne({
                    buyer: req.user.id,
                    book: bookId
                });
                if (!existingReview) {
                    return res.status(409).json({
                        message: "You have already reviewed this book"
                    });
                }
                const [bookRating, sellerRating] = await Promise.all([
                    recalculateBookRating(existingReview.book),
                    recalculateSellerRating(existingReview.seller)
                ]);
                return res.status(200).json({
                    message: "Review already submitted; ratings are up to date",
                    review: existingReview,
                    bookRating,
                    sellerRating
                });
            } catch {
                return res.status(500).json({
                    message: "Review already exists, but aggregate ratings could not be recalculated"
                });
            }
        }
        return res.status(500).json({ message: "Failed to submit review" });
    }
};

const getBookReviews = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.bookId)) {
            return res.status(400).json({ message: "Invalid book ID" });
        }
        const bookId = req.params.bookId.toLowerCase();
        const [reviews, reviewCount, book] = await Promise.all([
            Review.find({ book: bookId })
                .populate("buyer", "name")
                .sort({ createdAt: -1 })
                .limit(100),
            Review.countDocuments({ book: bookId }),
            Book.findById(bookId).select("rating")
        ]);
        return res.status(200).json({
            reviews,
            averageRating: book?.rating || 0,
            reviewCount
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve reviews" });
    }
};

const getReviewEligibility = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.bookId)) {
            return res.status(400).json({ message: "Invalid book ID" });
        }
        const bookId = req.params.bookId.toLowerCase();
        const [existingReview, eligibleOrders] = await Promise.all([
            Review.findOne({ buyer: req.user.id, book: bookId }).select("_id"),
            Order.find({
                buyer: req.user.id,
                status: "Delivered",
                "payment.status": "succeeded",
                "items.book": bookId
            })
                .select("_id createdAt")
                .sort({ createdAt: -1 })
        ]);
        return res.status(200).json({
            hasReviewed: Boolean(existingReview),
            eligibleOrders: existingReview ? [] : eligibleOrders
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to verify review eligibility"
        });
    }
};

const getSellerReviews = async (req, res) => {
    try {
        const seller = req.params.seller.trim();
        if (!seller || seller.length > 160) {
            return res.status(400).json({ message: "Invalid seller name" });
        }
        const [reviews, rating] = await Promise.all([
            Review.find({ seller }).populate("buyer", "name").sort({ createdAt: -1 }).limit(100),
            SellerRating.findOne({ seller }).select("averageRating reviewCount")
        ]);
        return res.status(200).json({
            reviews,
            averageRating: rating?.averageRating || 0,
            reviewCount: rating?.reviewCount || 0
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve seller reviews" });
    }
};

module.exports = {
    addCartItem,
    calculateCartSubtotal,
    checkout,
    clearCart,
    getBookReviews,
    getReviewEligibility,
    getCart,
    getOrder,
    getSellerReviews,
    hasRawPaymentData,
    listOrders,
    razorpayWebhook,
    reportRazorpayFailure,
    removeCartItem,
    requestCancellation,
    requestReturn,
    submitReview,
    updateTrackingStatus,
    validateShippingAddress,
    validateCoupon,
    verifyRazorpayPayment
};
