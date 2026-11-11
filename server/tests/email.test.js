jest.mock("nodemailer", () => ({
    createTransport: jest.fn()
}));

const nodemailer = require("nodemailer");
const { sendPasswordResetEmail } = require("../src/services/email");

const EMAIL_ENV_KEYS = [
    "EMAIL_PROVIDER",
    "EMAIL_FROM",
    "BREVO_API_KEY",
    "SMTP_FROM",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD"
];

describe("password reset email delivery", () => {
    let originalEnv;
    let originalFetch;

    beforeEach(() => {
        originalEnv = Object.fromEntries(
            EMAIL_ENV_KEYS.map((key) => [key, process.env[key]])
        );
        originalFetch = global.fetch;
        global.fetch = jest.fn();
        for (const key of EMAIL_ENV_KEYS) {
            delete process.env[key];
        }
        nodemailer.createTransport.mockReset();
    });

    afterEach(() => {
        for (const key of EMAIL_ENV_KEYS) {
            if (originalEnv[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = originalEnv[key];
            }
        }
        global.fetch = originalFetch;
    });

    test("sends through Brevo HTTPS API with verified sender configuration", async () => {
        process.env.EMAIL_PROVIDER = "brevo";
        process.env.EMAIL_FROM = "Online Bookstore <sender@example.com>";
        process.env.BREVO_API_KEY = "test-api-key";
        global.fetch.mockResolvedValue({ ok: true, status: 201 });

        await sendPasswordResetEmail({
            email: "buyer@example.com",
            resetUrl: "http://localhost:5173/reset-password?token=sample"
        });

        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.brevo.com/v3/smtp/email",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({ "api-key": "test-api-key" }),
                body: JSON.stringify({
                    sender: { name: "Online Bookstore", email: "sender@example.com" },
                    to: [{ email: "buyer@example.com" }],
                    subject: "Reset your Online Bookstore password",
                    textContent:
                        "Use this link within 30 minutes to reset your password: http://localhost:5173/reset-password?token=sample\n\nIf you did not request this, you can ignore this email."
                })
            })
        );
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    test("reports missing Brevo API credentials", async () => {
        process.env.EMAIL_PROVIDER = "brevo";
        process.env.EMAIL_FROM = "sender@example.com";

        await expect(
            sendPasswordResetEmail({
                email: "buyer@example.com",
                resetUrl: "http://localhost:5173/reset-password?token=sample"
            })
        ).rejects.toThrow("BREVO_API_KEY is not configured");
    });

    test("rejects unsuccessful Brevo API responses without exposing response content", async () => {
        process.env.EMAIL_PROVIDER = "brevo";
        process.env.EMAIL_FROM = "sender@example.com";
        process.env.BREVO_API_KEY = "test-api-key";
        global.fetch.mockResolvedValue({
            ok: false,
            status: 401,
            body: { cancel: jest.fn().mockResolvedValue(undefined) }
        });

        await expect(
            sendPasswordResetEmail({
                email: "buyer@example.com",
                resetUrl: "http://localhost:5173/reset-password?token=sample"
            })
        ).rejects.toThrow("Brevo email API request failed with status 401");
    });

    test("continues supporting SMTP as the default provider", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.SMTP_PORT = "587";
        process.env.SMTP_USER = "sender@example.com";
        process.env.SMTP_PASSWORD = "test-password";
        process.env.SMTP_FROM = "Online Bookstore <sender@example.com>";
        const sendMail = jest.fn().mockResolvedValue(undefined);
        nodemailer.createTransport.mockReturnValue({ sendMail });

        await sendPasswordResetEmail({
            email: "buyer@example.com",
            resetUrl: "http://localhost:5173/reset-password?token=sample"
        });

        expect(sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                from: "Online Bookstore <sender@example.com>",
                to: "buyer@example.com"
            })
        );
    });
});
