import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        vi.restoreAllMocks();
        global.fetch = vi.fn((url) => {
            if (url.endsWith("/api/books/book-1")) {
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
});
