const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
    addCartItem,
    clearCart,
    getCart,
    removeCartItem
} = require("../controllers/commerceController");

const router = express.Router();

router.use(authenticate);
router.get("/", getCart);
router.post("/items", addCartItem);
router.delete("/items/:bookId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
