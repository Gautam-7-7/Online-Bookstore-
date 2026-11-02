const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
    createBook,
    getSellerBook,
    getSellerBooks,
    getSellerDashboard,
    getBooks,
    getBookById,
    removeBook,
    updateBook
} = require("../controllers/bookController");

const router = express.Router();

router.post("/", authenticate, createBook);
router.get("/seller/dashboard", authenticate, getSellerDashboard);
router.get("/mine", authenticate, getSellerBooks);
router.get("/mine/:id", authenticate, getSellerBook);
router.put("/:id", authenticate, updateBook);
router.delete("/:id", authenticate, removeBook);
router.get("/", getBooks);
router.get("/:id", getBookById);

module.exports = router;
