const PDFDocument = require("pdfkit");
const Order = require("../models/Order");

const downloadInvoice = async (req, res) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await Order.findOne({
            _id: req.params.orderId,
            buyer: req.user.id,
            "payment.status": "succeeded"
        }).lean();
        if (!order) {
            return res.status(404).json({
                message: "Paid order not found"
            });
        }

        const invoiceNumber = order.invoiceNumber || `OB-${order._id.toString().toUpperCase()}`;
        res.status(200);
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
            "Cache-Control": "private, no-store"
        });

        const document = new PDFDocument({ size: "A4", margin: 52 });
        document.on("error", () => res.destroy());
        document.pipe(res);
        document.fontSize(22).text("Online Bookstore", { align: "center" });
        document.moveDown(0.5).fontSize(18).text("Order invoice", { align: "center" });
        document.moveDown();
        document.fontSize(10).text(`Invoice: ${invoiceNumber}`);
        document.text(`Order: ${order._id}`);
        document.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`);
        document.text(`Payment reference: ${order.payment.transactionId || "Razorpay"}`);
        document.moveDown();
        document.fontSize(12).text("Bill to", { underline: true });
        document.fontSize(10).text(order.shippingAddress.fullName);
        document.text(order.shippingAddress.addressLine1);
        if (order.shippingAddress.addressLine2) {
            document.text(order.shippingAddress.addressLine2);
        }
        document.text(
            `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`
        );
        document.text(order.shippingAddress.country);
        document.moveDown();
        document.fontSize(11).text("Items", { underline: true });
        document.moveDown(0.4);
        for (const item of order.items) {
            document.fontSize(10).text(
                `${item.title}  |  ${item.quantity} x ${order.currency} ${item.unitPrice.toFixed(2)}  |  ${order.currency} ${(item.quantity * item.unitPrice).toFixed(2)}`
            );
        }
        document.moveDown();
        document.text(`Subtotal: ${order.currency} ${order.subtotal.toFixed(2)}`);
        document.text(`Discount: -${order.currency} ${order.discount.toFixed(2)}`);
        document.fontSize(13).text(`Total paid: ${order.currency} ${order.total.toFixed(2)}`);
        document.moveDown(2);
        document.fontSize(9).fillColor("#555555").text(
            "This is a computer-generated invoice. Payment was processed securely by the configured payment gateway."
        );
        document.end();
    } catch (error) {
        if (!res.headersSent) {
            return res.status(500).json({ message: "Failed to generate invoice" });
        }
        return res.destroy(error);
    }
};

module.exports = { downloadInvoice };
