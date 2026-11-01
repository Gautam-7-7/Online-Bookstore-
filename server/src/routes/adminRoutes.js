const express = require("express");
const authenticate = require("../middleware/authenticate");
const requireAdmin = require("../middleware/requireAdmin");
const {
    createCoupon,
    getAdminAnalytics,
    getAdminCoupons,
    getAuditLogs,
    getModerationQueue,
    getUsers,
    reviewModerationReport,
    updateCouponStatus,
    updateUserStatus
} = require("../controllers/adminController");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/moderation/reports", getModerationQueue);
router.patch("/moderation/reports/:reportId", reviewModerationReport);
router.get("/users", getUsers);
router.patch("/users/:userId", updateUserStatus);
router.get("/analytics", getAdminAnalytics);
router.get("/coupons", getAdminCoupons);
router.post("/coupons", createCoupon);
router.patch("/coupons/:couponId", updateCouponStatus);
router.get("/audit-logs", getAuditLogs);

module.exports = router;
