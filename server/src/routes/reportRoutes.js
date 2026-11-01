const express = require("express");
const authenticate = require("../middleware/authenticate");
const { createBookReport } = require("../controllers/reportController");

const router = express.Router();

router.post("/books/:bookId", authenticate, createBookReport);

module.exports = router;
