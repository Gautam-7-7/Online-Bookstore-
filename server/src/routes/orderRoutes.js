const express = require("express");
const authenticate = require("../middleware/authenticate");
const verifyShippingWebhook = require("../middleware/verifyShippingWebhook");
const {
    checkout,
    getOrder,
    listOrders,
    reportRazorpayFailure,
    requestCancellation,
    requestReturn,
    updateTrackingStatus,
    verifyRazorpayPayment
} = require("../controllers/commerceController");

const router = express.Router();

router.post("/checkout", authenticate, checkout);
router.get("/", authenticate, listOrders);
router.post("/:orderId/tracking", verifyShippingWebhook, updateTrackingStatus);
router.post("/:orderId/payment/verify", authenticate, verifyRazorpayPayment);
router.post("/:orderId/payment/failure", authenticate, reportRazorpayFailure);
router.post("/:orderId/cancellation", authenticate, requestCancellation);
router.post("/:orderId/return", authenticate, requestReturn);
router.get("/:orderId", authenticate, getOrder);

module.exports = router;
