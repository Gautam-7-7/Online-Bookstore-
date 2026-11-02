const express = require("express");
const authenticate = require("../middleware/authenticate");
const { validateCoupon } = require("../controllers/commerceController");

const router = express.Router();

router.post("/validate", authenticate, validateCoupon);

module.exports = router;
