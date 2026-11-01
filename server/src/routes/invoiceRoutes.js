const express = require("express");
const authenticate = require("../middleware/authenticate");
const { downloadInvoice } = require("../controllers/invoiceController");

const router = express.Router();

router.get("/:orderId/invoice", authenticate, downloadInvoice);

module.exports = router;
