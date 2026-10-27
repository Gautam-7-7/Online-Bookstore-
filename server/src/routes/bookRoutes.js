const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
    createBook,
    getBooks,
    getBookById
} = require("../controllers/bookController");

const router = express.Router();

router.post("/", authenticate, createBook);
router.get("/", getBooks);
router.get("/:id", getBookById);

module.exports = router;
