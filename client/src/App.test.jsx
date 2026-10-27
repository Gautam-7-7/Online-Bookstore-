import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const catalogueResponse = {
    books,
    page: 1,
    totalPages: 1,
    totalBooks: 1
};

const renderApp = (initialEntries = ["/"]) =>
    render(
        <MemoryRouter initialEntries={initialEntries}>
            <App />
        </MemoryRouter>
    );

describe("catalogue frontend", () => {
    beforeEach(() => {
        cleanup();
        vi.restoreAllMocks();
        localStorage.clear();
        global.fetch = vi.fn((url, options = {}) => {
            if (url.endsWith("/api/books/book-1")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ book: books[0] })
                });
            }

            if (url.endsWith("/api/auth/register")) {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        message: "User registered successfully",
                        user: { id: "user-1", name: "Reader", email: "reader@example.com" }
                    })
                });
            }

            if (url.endsWith("/api/auth/login")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        message: "Login successful",
                        token: "signed-token",
                        user: { id: "user-1", name: "Reader", email: "reader@example.com" }
                    })
                });
            }

            if (url.endsWith("/api/books") && options.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({
                        message: "Book created successfully",
                        book: { ...books[0], _id: "created-book" }
                    })
                });
            }

            if (url.endsWith("/api/books/created-book")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ book: books[0] })
                });
            }

            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => catalogueResponse
            });
        });
    });

    test("renders catalogue results and sends search and filter parameters", async () => {
        renderApp();

        expect(await screen.findByText("Clean Code")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Search books"), {
            target: { value: "Martin" }
        });
        fireEvent.submit(screen.getByRole("search"));
        fireEvent.change(screen.getByLabelText("Category"), {
            target: { value: "Programming" }
        });
        fireEvent.change(screen.getByLabelText("Availability"), {
            target: { value: "in_stock" }
        });
        fireEvent.change(screen.getByLabelText("Minimum price"), {
            target: { value: "100" }
        });
        fireEvent.change(screen.getByLabelText("Maximum price"), {
            target: { value: "600" }
        });

        await waitFor(() => {
            const requests = global.fetch.mock.calls.map(([url]) => url);
            expect(requests.some((url) => url.includes("search=Martin"))).toBe(
                true
            );
            expect(
                requests.some((url) => url.includes("category=Programming"))
            ).toBe(true);
            expect(
                requests.some((url) => url.includes("availability=in_stock"))
            ).toBe(true);
            expect(requests.some((url) => url.includes("minPrice=100"))).toBe(
                true
            );
            expect(requests.some((url) => url.includes("maxPrice=600"))).toBe(
                true
            );
        });
    });

    test("shows loading and empty states", async () => {
        let resolveRequest;
        global.fetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveRequest = resolve;
                })
        );

        renderApp();
        expect(screen.getByText("Loading books…")).toBeInTheDocument();

        resolveRequest({
            ok: true,
            status: 200,
            json: async () => ({
                books: [],
                page: 1,
                totalPages: 1,
                totalBooks: 0
            })
        });

        expect(await screen.findByText("No books found.")).toBeInTheDocument();
    });

    test("shows API errors", async () => {
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                json: async () => ({ message: "Backend unavailable" })
            })
        );

        renderApp();

        expect(
            await screen.findByText("Could not load books: Backend unavailable")
        ).toBeInTheDocument();
    });

    test("navigates to a book detail page and renders details", async () => {
        renderApp();

        fireEvent.click(await screen.findByRole("link", { name: /Clean Code/ }));

        expect(await screen.findByText("Seller One")).toBeInTheDocument();
        expect(screen.getByText("A software craftsmanship book.")).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith("/api/books/book-1");
    });

    test("registers with the backend and directs the user to login", async () => {
        renderApp(["/register"]);

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "Reader" }
        });
        fireEvent.change(screen.getByLabelText("Email"), {
            target: { value: "reader@example.com" }
        });
        fireEvent.change(screen.getByLabelText("Password"), {
            target: { value: "Test@12345" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Register" }));

        expect(
            await screen.findByText("Account created. Log in to continue.")
        ).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(
            "/api/auth/register",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    name: "Reader",
                    email: "reader@example.com",
                    password: "Test@12345"
                })
            })
        );
    });

    test("requires login to list a book and submits with the JWT", async () => {
        renderApp(["/sell"]);

        expect(await screen.findByRole("heading", { name: "Log in" })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Email"), {
            target: { value: "reader@example.com" }
        });
        fireEvent.change(screen.getByLabelText("Password"), {
            target: { value: "Test@12345" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Log in" }));

        expect(await screen.findByRole("heading", { name: "List a book" })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "The Test Book" }
        });
        fireEvent.change(screen.getByLabelText("Author"), {
            target: { value: "Test Author" }
        });
        fireEvent.change(screen.getByLabelText("ISBN"), {
            target: { value: "9780132350884" }
        });
        fireEvent.change(screen.getByLabelText("Category"), {
            target: { value: "Testing" }
        });
        fireEvent.change(screen.getByLabelText("Price"), {
            target: { value: "125.5" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Create listing" }));

        await screen.findByText("Seller One");
        const [requestUrl, requestOptions] = global.fetch.mock.calls.find(
            ([url, options]) => url.endsWith("/api/books") && options?.method === "POST"
        );
        expect(requestUrl).toBe("/api/books");
        expect(requestOptions.headers.Authorization).toBe("Bearer signed-token");
        expect(JSON.parse(requestOptions.body)).toMatchObject({
            title: "The Test Book",
            price: 125.5,
            stock: 0
        });
        expect(JSON.parse(requestOptions.body)).not.toHaveProperty("seller");
        expect(localStorage.getItem("online-bookstore-auth")).toContain("signed-token");
    });
});
