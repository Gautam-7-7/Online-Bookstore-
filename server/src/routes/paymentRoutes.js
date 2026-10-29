const express = require("express");
const { razorpayWebhook } = require("../controllers/commerceController");

const router = express.Router();

router.post("/razorpay/webhook", razorpayWebhook);

module.exports = router;
