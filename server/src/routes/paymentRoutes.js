const express = require("express");
const {
    getRazorpayStatus,
    razorpayWebhook
} = require("../controllers/commerceController");

const router = express.Router();

router.post("/razorpay/webhook", razorpayWebhook);
router.get("/razorpay/status", getRazorpayStatus);

module.exports = router;
