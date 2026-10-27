import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";

const books = [
    {
        _id: "book-1",
        title: "Clean Code",
        author: "Robert Martin",
        isbn: "9780132350884",
        category: "Programming",
        price: 540,
        condition: "New",
        seller: "Seller One",
        stock: 3,
        description: "A software craftsmanship book."
    }
];

describe("authentication flows", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
        global.fetch = vi.fn((url) => {
            if (typeof url === "string" && url.endsWith("/api/auth/login")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        token: "test-token",
                        user: { id: "u1", name: "Test User", email: "user@example.com" }
                    })
                });
            }

            if (typeof url === "string" && url.endsWith("/api/auth/me")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        user: { id: "u1", name: "Test User", email: "user@example.com" }
                    })
                });
            }

            if (typeof url === "string" && url.endsWith("/api/books")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ books, page: 1, totalPages: 1, totalBooks: 1 })
                });
            }

            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => ({ book: books[0] })
            });
        });
    });

    test("logs in with the email and password fields", async () => {
        render(
            <MemoryRouter initialEntries={["/login"]}>
                <App />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText("Email"), {
            target: { value: "user@example.com" }
        });
        fireEvent.change(screen.getByLabelText("Password"), {
            target: { value: "StrongPass1!" }
        });

        fireEvent.click(screen.getByRole("button", { name: "Log in" }));

        expect(await screen.findByText("Hi, Test")).toBeInTheDocument();
        expect(localStorage.getItem("bookstore_token")).toBe("test-token");
    });
});
