const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const Book = require("../models/Book");
const Coupon = require("../models/Coupon");
const ModerationReport = require("../models/ModerationReport");
const Order = require("../models/Order");
const User = require("../models/User");

const isValidObjectId = (value) =>
    typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const writeAuditLog = (actor, action, targetType, targetId, details = {}) =>
    AuditLog.create({ actor, action, targetType, targetId: String(targetId), details });

const getModerationQueue = async (req, res) => {
    try {
        const reports = await ModerationReport.find({ status: "pending" })
            .populate("book", "title author isbn seller isActive moderationStatus")
            .populate("reporter", "name email")
            .sort({ createdAt: 1 })
            .limit(200)
            .lean();
        return res.status(200).json({ reports });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve moderation queue" });
    }
};

const reviewModerationReport = async (req, res) => {
    const { reportId } = req.params;
    const { action, note = "" } = req.body || {};
    if (!isValidObjectId(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
    }
    if (!["approve", "reject", "remove"].includes(action)) {
        return res.status(400).json({ message: "Action must be approve, reject or remove" });
    }
    if (typeof note !== "string" || note.length > 500) {
        return res.status(400).json({ message: "Reviewer note must be 500 characters or fewer" });
    }

    try {
        const report = await ModerationReport.findOne({
            _id: reportId,
            status: "pending"
        });
        if (!report) {
            return res.status(404).json({ message: "Pending report not found" });
        }
        const book = await Book.findById(report.book);
        if (!book) {
            if (action === "reject") {
                report.status = "rejected";
                report.reviewedBy = req.user.id;
                report.reviewedAt = new Date();
                report.reviewerNote = note.trim();
                await report.save();
                await writeAuditLog(
                    req.user.id,
                    "moderation.reject",
                    "report",
                    report._id,
                    { note: report.reviewerNote, listingMissing: true }
                );
                return res.status(200).json({ message: "Report rejected", report });
            }
            return res.status(409).json({ message: "Reported listing no longer exists" });
        }
        const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "removed";
        report.status = status;
        report.reviewedBy = req.user.id;
        report.reviewedAt = new Date();
        report.reviewerNote = note.trim();
        await report.save();

        if (action === "remove") {
            book.isActive = false;
            book.moderationStatus = "rejected";
        } else if (action === "approve") {
            book.moderationStatus = "approved";
        } else {
            const otherPendingReports = await ModerationReport.exists({
                book: book._id,
                status: "pending",
                _id: { $ne: report._id }
            });
            book.moderationStatus = otherPendingReports ? "flagged" : "clear";
        }
        await book.save();
        await writeAuditLog(req.user.id, `moderation.${action}`, "report", report._id, {
            bookId: book._id,
            note: report.reviewerNote
        });
        return res.status(200).json({ message: `Report ${status}`, report, book });
    } catch (error) {
        return res.status(500).json({ message: "Failed to review moderation report" });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select("name email role isSellerVerified isSuspended createdAt")
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();
        return res.status(200).json({ users });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve accounts" });
    }
};

const updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { action } = req.body || {};
    if (!isValidObjectId(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    if (!["suspend", "reinstate", "verify_seller", "unverify_seller"].includes(action)) {
        return res.status(400).json({ message: "Unsupported account action" });
    }
    if (userId === String(req.user.id) && action === "suspend") {
        return res.status(400).json({ message: "Administrators cannot suspend their own account" });
    }

    try {
        const user = await User.findById(userId);
        if (!user || user.role === "admin") {
            return res.status(404).json({ message: "Eligible account not found" });
        }
        if (action === "suspend") {
            user.isSuspended = true;
        } else if (action === "reinstate") {
            user.isSuspended = false;
        } else {
            user.isSellerVerified = action === "verify_seller";
            user.role = action === "verify_seller" ? "seller" : "buyer";
        }
        await user.save();
        await writeAuditLog(req.user.id, `account.${action}`, "user", user._id);
        return res.status(200).json({
            message: `Account ${action.replace("_", " ")}`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isSellerVerified: user.isSellerVerified,
                isSuspended: user.isSuspended
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update account" });
    }
};

const getAdminAnalytics = async (req, res) => {
    try {
        const paidOrders = { "payment.status": { $in: ["succeeded", "refunded"] } };
        const [orderSummary, topTitles, activeSellers, accountSummary, listingSummary] =
            await Promise.all([
                Order.aggregate([
                    { $match: paidOrders },
                    {
                        $group: {
                            _id: null,
                            paidOrders: { $sum: 1 },
                            grossRevenue: { $sum: "$total" },
                            refundedOrders: {
                                $sum: { $cond: [{ $eq: ["$payment.status", "refunded"] }, 1, 0] }
                            },
                            refundedAmount: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$payment.status", "refunded"] },
                                        "$total",
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]),
                Order.aggregate([
                    { $match: { "payment.status": "succeeded" } },
                    { $unwind: "$items" },
                    {
                        $group: {
                            _id: "$items.title",
                            unitsSold: { $sum: "$items.quantity" },
                            grossSales: {
                                $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] }
                            }
                        }
                    },
                    { $sort: { unitsSold: -1, grossSales: -1, _id: 1 } },
                    { $limit: 10 }
                ]),
                Book.aggregate([
                    { $match: { isActive: true, sellerId: { $ne: null } } },
                    { $group: { _id: "$sellerId" } },
                    { $count: "count" }
                ]),
                User.aggregate([
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            suspended: { $sum: { $cond: ["$isSuspended", 1, 0] } },
                            verifiedSellers: {
                                $sum: { $cond: ["$isSellerVerified", 1, 0] }
                            }
                        }
                    }
                ]),
                Book.aggregate([
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            active: { $sum: { $cond: ["$isActive", 1, 0] } },
                            flagged: {
                                $sum: { $cond: [{ $eq: ["$moderationStatus", "flagged"] }, 1, 0] }
                            }
                        }
                    }
                ])
            ]);

        const summary = orderSummary[0] || {
            paidOrders: 0,
            grossRevenue: 0,
            refundedOrders: 0,
            refundedAmount: 0
        };
        return res.status(200).json({
            orders: summary,
            netRevenue: Math.round((summary.grossRevenue - summary.refundedAmount) * 100) / 100,
            topTitles,
            activeSellers: activeSellers[0]?.count || 0,
            users: accountSummary[0] || { total: 0, suspended: 0, verifiedSellers: 0 },
            listings: listingSummary[0] || { total: 0, active: 0, flagged: 0 }
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to calculate administrator analytics" });
    }
};

const getAdminCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort({ createdAt: -1 }).limit(500).lean();
        return res.status(200).json({ coupons });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve coupons" });
    }
};

const createCoupon = async (req, res) => {
    const body = req.body || {};
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const expiresAt = new Date(body.expiresAt);
    if (
        !/^[A-Z0-9_-]{3,32}$/.test(code) ||
        !["percentage", "fixed"].includes(body.discountType) ||
        !Number.isFinite(body.discountValue) ||
        body.discountValue <= 0 ||
        (body.discountType === "percentage" && body.discountValue > 100) ||
        !Number.isFinite(expiresAt.getTime()) ||
        expiresAt <= new Date() ||
        (body.minimumOrderAmount !== undefined &&
            (!Number.isFinite(body.minimumOrderAmount) || body.minimumOrderAmount < 0)) ||
        (body.maxRedemptions !== undefined &&
            (!Number.isSafeInteger(body.maxRedemptions) || body.maxRedemptions < 1))
    ) {
        return res.status(400).json({ message: "Coupon fields are invalid" });
    }
    const startsAt = body.startsAt === undefined ? new Date() : new Date(body.startsAt);
    if (!Number.isFinite(startsAt.getTime()) || startsAt >= expiresAt) {
        return res.status(400).json({ message: "Coupon start must be before its expiry" });
    }
    try {
        const coupon = await Coupon.create({
            code,
            discountType: body.discountType,
            discountValue: body.discountValue,
            minimumOrderAmount: body.minimumOrderAmount ?? 0,
            startsAt,
            expiresAt,
            maxRedemptions: body.maxRedemptions ?? null
        });
        await writeAuditLog(req.user.id, "coupon.create", "coupon", coupon._id, { code });
        return res.status(201).json({ coupon });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Coupon code already exists" });
        }
        return res.status(500).json({ message: "Failed to create coupon" });
    }
};

const updateCouponStatus = async (req, res) => {
    const { couponId } = req.params;
    const { isActive } = req.body || {};
    if (!isValidObjectId(couponId) || typeof isActive !== "boolean") {
        return res.status(400).json({ message: "Valid coupon ID and isActive flag are required" });
    }
    try {
        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { $set: { isActive } },
            { new: true, runValidators: true }
        );
        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }
        await writeAuditLog(req.user.id, "coupon.set_active", "coupon", coupon._id, {
            isActive
        });
        return res.status(200).json({ coupon });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update coupon" });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const auditLogs = await AuditLog.find({})
            .populate("actor", "name email")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        return res.status(200).json({ auditLogs });
    } catch (error) {
        return res.status(500).json({ message: "Failed to retrieve audit log" });
    }
};

module.exports = {
    createCoupon,
    getAdminAnalytics,
    getAdminCoupons,
    getAuditLogs,
    getModerationQueue,
    getUsers,
    reviewModerationReport,
    updateCouponStatus,
    updateUserStatus
};
