const bcrypt = require("bcryptjs");

describe("Authentication", () => {
    test("password should be hashed correctly", async () => {
        const password = "Test@12345";

        const hashedPassword = await bcrypt.hash(password, 12);

        const isMatch = await bcrypt.compare(password, hashedPassword);

        expect(isMatch).toBe(true);
        expect(hashedPassword).not.toBe(password);
    });

    test("wrong password should fail", async () => {
        const password = "Test@12345";

        const hashedPassword = await bcrypt.hash(password, 12);

        const isMatch = await bcrypt.compare(
            "WrongPassword",
            hashedPassword
        );

        expect(isMatch).toBe(false);
    });
});