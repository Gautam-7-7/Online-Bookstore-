const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
    getBookReviews,
    getReviewEligibility,
    getSellerReviews,
    submitReview
} = require("../controllers/commerceController");

const router = express.Router();

router.post("/", authenticate, submitReview);
router.get("/eligibility/:bookId", authenticate, getReviewEligibility);
router.get("/books/:bookId", getBookReviews);
router.get("/sellers/:seller", getSellerReviews);

module.exports = router;
