const nodemailer = require("nodemailer");

const getTransport = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
        throw new Error("Email delivery is not configured");
    }
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
    });
};

const sendPasswordResetEmail = async ({ email, resetUrl }) => {
    const from = process.env.SMTP_FROM;
    if (!from) {
        throw new Error("SMTP_FROM is not configured");
    }
    const transport = getTransport();
    await transport.sendMail({
        from,
        to: email,
        subject: "Reset your Online Bookstore password",
        text: `Use this link within 30 minutes to reset your password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`
    });
};

module.exports = { sendPasswordResetEmail };
