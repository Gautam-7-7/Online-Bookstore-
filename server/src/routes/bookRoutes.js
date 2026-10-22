const express = require("express");
const {
    createBook,
    getBooks,
    getBookById
} = require("../controllers/bookController");

const router = express.Router();

router.post("/", createBook);
router.get("/", getBooks);
router.get("/:id", getBookById);

module.exports = router;
