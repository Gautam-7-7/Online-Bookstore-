require("dotenv").config();

jest.mock("../src/services/email", () => ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined)
}));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const AuditLog = require("../src/models/AuditLog");
const Book = require("../src/models/Book");
const Coupon = require("../src/models/Coupon");
const ModerationReport = require("../src/models/ModerationReport");
const Order = require("../src/models/Order");
const User = require("../src/models/User");
const { sendPasswordResetEmail } = require("../src/services/email");

const runId = Date.now().toString();
const adminEmail = `admin-${runId}@example.test`;
const buyerEmail = `buyer-${runId}@example.test`;
const secondEmail = `other-${runId}@example.test`;
const ids = {};
let adminToken;
let buyerToken;
let otherToken;
let createdOrderId;
let resetToken;
const previousResetUrl = process.env.PASSWORD_RESET_URL;

const parsePdf = (response, callback) => {
    response.setEncoding("binary");
    let data = "";
    response.on("data", (chunk) => {
        data += chunk;
    });
    response.on("end", () => callback(null, Buffer.from(data, "binary")));
};

describe("Remaining SRS account, invoice and administration workflows", () => {
    beforeAll(async () => {
        process.env.JWT_SECRET ||= "srs-integration-test-secret";
        process.env.PASSWORD_RESET_URL = "http://localhost:5173/reset-password";
        await mongoose.connect(process.env.MONGODB_URI);
        const password = await bcrypt.hash("Test@12345", 12);
        const [admin, buyer, other] = await User.create([
            { name: "Platform Admin", email: adminEmail, password, role: "admin" },
            { name: "Verified Buyer", email: buyerEmail, password },
            { name: "Other Buyer", email: secondEmail, password }
        ]);
        ids.admin = admin._id;
        ids.buyer = buyer._id;
        ids.other = other._id;
        adminToken = jwt.sign({ userId: admin._id, email: admin.email }, process.env.JWT_SECRET);
        buyerToken = jwt.sign({ userId: buyer._id, email: buyer.email }, process.env.JWT_SECRET);
        otherToken = jwt.sign({ userId: other._id, email: other.email }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        await Promise.all([
            AuditLog.deleteMany({ actor: { $in: Object.values(ids) } }),
            ModerationReport.deleteMany({ reporter: { $in: Object.values(ids) } }),
            Book.deleteMany({ sellerId: ids.buyer }),
            Coupon.deleteMany({ code: { $regex: `^SRS${runId.slice(-8).toUpperCase()}` } }),
            Order.deleteMany({ _id: createdOrderId }),
            User.deleteMany({ _id: { $in: Object.values(ids) } })
        ]);
        if (previousResetUrl === undefined) {
            delete process.env.PASSWORD_RESET_URL;
        } else {
            process.env.PASSWORD_RESET_URL = previousResetUrl;
        }
        await mongoose.connection.close();
    });

    test("supports profile updates and single-use email password reset", async () => {
        const profile = await request(app)
            .patch("/api/account/me")
            .set("Authorization", `Bearer ${buyerToken}`)
            .send({ name: "Updated Buyer", phone: "+91 9876543210" });
        expect(profile.status).toBe(200);
        expect(profile.body.user).toMatchObject({
            name: "Updated Buyer",
            phone: "+91 9876543210"
        });

        const resetRequest = await request(app)
            .post("/api/account/password/forgot")
            .send({ email: buyerEmail });
        expect(resetRequest.status).toBe(202);
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        const resetUrl = new URL(sendPasswordResetEmail.mock.calls[0][0].resetUrl);
        resetToken = resetUrl.searchParams.get("token");
        expect(resetToken).toHaveLength(43);

        const reset = await request(app)
            .post("/api/account/password/reset")
            .send({ token: resetToken, password: "Changed@12345" });
        expect(reset.status).toBe(200);

        const reused = await request(app)
            .post("/api/account/password/reset")
            .send({ token: resetToken, password: "Changed@12345" });
        expect(reused.status).toBe(400);

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: buyerEmail, password: "Changed@12345" });
        expect(login.status).toBe(200);
    });

    test("moderates user-reported listings and writes an audit trail", async () => {
        const book = await Book.create({
            title: "Reported Book",
            author: "Test Author",
            isbn: "9780132350884",
            category: "Testing",
            price: 20,
            seller: "Verified Buyer",
            sellerId: ids.buyer,
            stock: 1
        });

        const submitted = await request(app)
            .post(`/api/reports/books/${book._id}`)
            .set("Authorization", `Bearer ${buyerToken}`)
            .send({ reason: "Listing description appears misleading" });
        expect(submitted.status).toBe(201);
        expect((await Book.findById(book._id)).moderationStatus).toBe("flagged");

        const queue = await request(app)
            .get("/api/admin/moderation/reports")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(queue.status).toBe(200);
        const queuedReport = queue.body.reports.find(
            (report) => report.book?._id === book._id.toString()
        );
        expect(queuedReport).toBeDefined();
        const reportId = queuedReport._id;
        const reviewed = await request(app)
            .patch(`/api/admin/moderation/reports/${reportId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ action: "remove", note: "Policy violation confirmed" });
        expect(reviewed.status).toBe(200);
        expect(reviewed.body.book.isActive).toBe(false);
        expect(await AuditLog.exists({ action: "moderation.remove", targetId: reportId })).toBeTruthy();
    });

    test("admin can verify sellers and suspend accounts; suspension blocks login", async () => {
        const verify = await request(app)
            .patch(`/api/admin/users/${ids.other}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ action: "verify_seller" });
        expect(verify.status).toBe(200);
        expect(verify.body.user).toMatchObject({ role: "seller", isSellerVerified: true });

        const suspended = await request(app)
            .patch(`/api/admin/users/${ids.other}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ action: "suspend" });
        expect(suspended.status).toBe(200);

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: secondEmail, password: "Test@12345" });
        expect(login.status).toBe(403);

        const existingSession = await request(app)
            .get("/api/account/me")
            .set("Authorization", `Bearer ${otherToken}`);
        expect(existingSession.status).toBe(401);

        const reinstated = await request(app)
            .patch(`/api/admin/users/${ids.other}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ action: "reinstate" });
        expect(reinstated.status).toBe(200);
    });

    test("admin manages coupons and analytics; non-admin access is forbidden", async () => {
        const forbidden = await request(app)
            .get("/api/admin/analytics")
            .set("Authorization", `Bearer ${buyerToken}`);
        expect(forbidden.status).toBe(403);

        const code = `SRS${runId.slice(-8)}`.toUpperCase();
        const coupon = await request(app)
            .post("/api/admin/coupons")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                code,
                discountType: "percentage",
                discountValue: 10,
                minimumOrderAmount: 20,
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
                maxRedemptions: 20
            });
        expect(coupon.status).toBe(201);

        const deactivated = await request(app)
            .patch(`/api/admin/coupons/${coupon.body.coupon._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ isActive: false });
        expect(deactivated.status).toBe(200);
        expect(deactivated.body.coupon.isActive).toBe(false);

        const analytics = await request(app)
            .get("/api/admin/analytics")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(analytics.status).toBe(200);
        expect(analytics.body).toEqual(
            expect.objectContaining({
                orders: expect.objectContaining({ paidOrders: expect.any(Number) }),
                activeSellers: expect.any(Number),
                topTitles: expect.any(Array)
            })
        );
        const logs = await request(app)
            .get("/api/admin/audit-logs")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(logs.status).toBe(200);
        expect(logs.body.auditLogs.some((log) => log.action === "coupon.create")).toBe(true);
    });

    test("generates paid-order PDF invoices only for their buyer", async () => {
        const bookId = new mongoose.Types.ObjectId();
        const order = await Order.create({
            buyer: ids.buyer,
            idempotencyKey: `invoice-${runId}`,
            items: [{
                book: bookId,
                title: "Invoice Test Book",
                seller: "Verified Buyer",
                sellerId: ids.buyer,
                quantity: 2,
                unitPrice: 25
            }],
            subtotal: 50,
            discount: 5,
            total: 45,
            currency: "INR",
            shippingAddress: {
                fullName: "Updated Buyer",
                addressLine1: "1 Test Lane",
                city: "Pune",
                state: "Maharashtra",
                postalCode: "411001",
                country: "India",
                phone: "9876543210"
            },
            payment: {
                provider: "razorpay",
                transactionId: "pay_test_invoice",
                status: "succeeded"
            },
            status: "Placed"
        });
        createdOrderId = order._id;

        const denied = await request(app)
            .get(`/api/orders/${order._id}/invoice`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(denied.status).toBe(404);

        const invoice = await request(app)
            .get(`/api/orders/${order._id}/invoice`)
            .set("Authorization", `Bearer ${buyerToken}`)
            .buffer(true)
            .parse(parsePdf);
        expect(invoice.status).toBe(200);
        expect(invoice.headers["content-type"]).toMatch(/application\/pdf/);
        expect(invoice.body.subarray(0, 4).toString()).toBe("%PDF");
    });
});
