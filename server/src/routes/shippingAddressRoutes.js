const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
    createShippingAddress,
    deleteShippingAddress,
    listShippingAddresses,
    setDefaultShippingAddress
} = require("../controllers/shippingAddressController");

const router = express.Router();

router.use(authenticate);
router.get("/", listShippingAddresses);
router.post("/", createShippingAddress);
router.patch("/:addressId/default", setDefaultShippingAddress);
router.delete("/:addressId", deleteShippingAddress);

module.exports = router;
