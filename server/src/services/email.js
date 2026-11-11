const nodemailer = require("nodemailer");

const getEmailContent = (email, resetUrl) => ({
    to: [{ email }],
    subject: "Reset your Online Bookstore password",
    textContent: `Use this link within 30 minutes to reset your password: ${resetUrl}\n\nIf you did not request this, you can ignore this email.`
});

const getBrevoSender = (from) => {
    const formatted = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
    const sender = formatted
        ? { name: formatted[1].replace(/^["']|["']$/g, ""), email: formatted[2].trim() }
        : { email: from.trim() };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email)) {
        throw new Error("EMAIL_FROM must contain a valid sender email address");
    }

    return sender;
};

const sendWithBrevo = async ({ email, resetUrl, from }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        throw new Error("BREVO_API_KEY is not configured");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": apiKey,
            "content-type": "application/json",
            accept: "application/json"
        },
        body: JSON.stringify({
            sender: getBrevoSender(from),
            ...getEmailContent(email, resetUrl)
        }),
        signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
        await response.body?.cancel();
        const error = new Error(
            `Brevo email API request failed with status ${response.status}`
        );
        error.code = "BREVO_API_ERROR";
        error.statusCode = response.status;
        throw error;
    }
};

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
    const from = process.env.EMAIL_FROM || process.env.SMTP_FROM;
    if (!from) {
        throw new Error("EMAIL_FROM is not configured");
    }

    if ((process.env.EMAIL_PROVIDER || "smtp").toLowerCase() === "brevo") {
        return sendWithBrevo({ email, resetUrl, from });
    }
    if (process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER.toLowerCase() !== "smtp") {
        throw new Error("EMAIL_PROVIDER must be smtp or brevo");
    }

    const transport = getTransport();
    await transport.sendMail({
        from,
        to: email,
        subject: "Reset your Online Bookstore password",
        text: getEmailContent(email, resetUrl).textContent
    });
};

module.exports = { sendPasswordResetEmail };
