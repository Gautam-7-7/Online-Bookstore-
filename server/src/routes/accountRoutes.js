const express = require("express");
const authenticate = require("../middleware/authenticate");
const {
    getProfile,
    requestPasswordReset,
    resetPassword,
    updateProfile
} = require("../controllers/accountController");

const router = express.Router();

router.post("/password/forgot", requestPasswordReset);
router.post("/password/reset", resetPassword);
router.get("/me", authenticate, getProfile);
router.patch("/me", authenticate, updateProfile);

module.exports = router;
