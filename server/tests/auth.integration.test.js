require("dotenv").config();

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");

const testEmail = `integration${Date.now()}@example.com`;

describe("Authentication API Integration Tests", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGODB_URI);
    });

    afterAll(async () => {
        await User.deleteOne({ email: testEmail });
        await mongoose.connection.close();
    });

    test("should register a new user", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Integration Test",
                email: testEmail,
                password: "Test@12345"
            });

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe("User registered successfully");
    });

    test("should login the registered user", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: testEmail,
                password: "Test@12345"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Login successful");
        expect(response.body.token).toBeDefined();
    });

    test("should lock account after 5 failed login attempts", async () => {
        const lockoutEmail = `lockout${Date.now()}@example.com`;

        await request(app)
            .post("/api/auth/register")
            .send({
                name: "Lockout Test",
                email: lockoutEmail,
                password: "Test@12345"
            });

        // 5 incorrect login attempts
        for (let i = 0; i < 5; i++) {
            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: lockoutEmail,
                    password: "WrongPassword"
                });

            expect(response.statusCode).toBe(401);
        }

        // Correct password should now be blocked
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: lockoutEmail,
                password: "Test@12345"
            });

        expect(response.statusCode).toBe(423);

        await User.deleteOne({ email: lockoutEmail });
    });
});