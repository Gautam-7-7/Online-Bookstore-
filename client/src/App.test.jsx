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
const homeAddress = {
    _id: "address-home",
    label: "Home",
    fullName: "Reader",
    addressLine1: "1 Main Street",
    addressLine2: "",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
    country: "India",
    phone: "9876543210",
    isDefault: true
};
const placedOrder = {
    _id: "order-1",
    createdAt: "2026-10-28T10:00:00.000Z",
    currency: "INR",
    status: "Placed",
    items: [{ book: "book-1", title: "Clean Code", quantity: 1, unitPrice: 540 }],
    subtotal: 540,
    discount: 0,
    total: 540,
    shippingAddress: homeAddress,
    payment: { status: "succeeded", transactionId: "pay-1" },
    trackingHistory: [
        { status: "Placed", occurredAt: "2026-10-28T10:00:00.000Z", source: "payment" }
    ]
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
        const savedAddresses = [homeAddress];
        const savedOrders = [placedOrder];
        global.fetch = vi.fn((url, options = {}) => {
            if (url.endsWith("/api/books/book-1") && options.method === "PUT") {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ book: { ...books[0], title: "Updated Title" } })
                });
            }

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

            if (url.endsWith("/api/books/seller/dashboard")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        seller: "Reader",
                        listings: { totalListings: 1, activeListings: 1, totalStock: 3 },
                        sales: { orders: 1, unitsSold: 2, revenue: 1080 },
                        rating: { averageRating: 4.5, reviewCount: 2 }
                    })
                });
            }

            if (url.endsWith("/api/cart") && options.method !== "DELETE") {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        cart: {
                            items: [
                                { book: books[0], quantity: 1, lineTotal: books[0].price }
                            ]
                        },
                        subtotal: books[0].price
                    })
                });
            }

            if (url.endsWith("/api/books/mine")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ books: [{ ...books[0], _id: "book-1", isActive: true }] })
                });
            }

            if (url.endsWith("/api/books/mine/book-1")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ book: books[0] })
                });
            }

            if (url.endsWith("/api/reviews/books/book-1")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        reviews: [],
                        averageRating: 0,
                        reviewCount: 0
                    })
                });
            }

            if (url.endsWith("/api/reviews/eligibility/book-1")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        hasReviewed: false,
                        eligibleOrders: [{ _id: "delivered-order", createdAt: "2026-10-01" }]
                    })
                });
            }

            if (url.endsWith("/api/reviews") && options.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({ review: { _id: "review-1" } })
                });
            }

            if (url.endsWith("/api/cart/items") && options.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ cart: { items: [] }, subtotal: 0 })
                });
            }

            if (url.endsWith("/api/coupons/validate") && options.method === "POST") {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({
                        code: "BOOK10",
                        subtotal: 540,
                        discount: 54,
                        total: 486
                    })
                });
            }

            if (url.endsWith("/api/addresses") && options.method === "POST") {
                const address = {
                    ...JSON.parse(options.body),
                    _id: "address-new"
                };
                savedAddresses.push(address);
                return Promise.resolve({
                    ok: true,
                    status: 201,
                    json: async () => ({ address })
                });
            }

            if (
                url.endsWith("/api/addresses") &&
                (!options.method || options.method === "GET")
            ) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ addresses: savedAddresses })
                });
            }

            if (url.endsWith("/api/orders/checkout")) {
                return Promise.resolve({
                    ok: false,
                    status: 503,
                    json: async () => ({ message: "Razorpay is not configured" })
                });
            }

            if (url.endsWith("/api/orders/order-1/cancellation")) {
                const updatedOrder = {
                    ...placedOrder,
                    status: "Cancelled",
                    returnRequest: {
                        type: "cancellation",
                        status: "refund_pending",
                        reason: JSON.parse(options.body).reason
                    }
                };
                savedOrders[0] = updatedOrder;
                return Promise.resolve({
                    ok: true,
                    status: 202,
                    json: async () => ({ order: updatedOrder })
                });
            }

            if (url.endsWith("/api/orders") && (!options.method || options.method === "GET")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ orders: savedOrders })
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

    test("adds an in-stock book to the authenticated buyer's cart", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "user-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/books/book-1"]);

        fireEvent.click(await screen.findByRole("button", { name: "Add to cart" }));
        expect(await screen.findByRole("status")).toHaveTextContent("Added to your cart.");
        expect(global.fetch).toHaveBeenCalledWith(
            "/api/cart/items",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({ Authorization: expect.any(String) }),
                body: JSON.stringify({ bookId: "book-1", quantity: 1 })
            })
        );
    });

    test("uses the buyer-selected saved address in the checkout order request", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "user-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/checkout"]);

        expect(await screen.findByText("Home")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

        await waitFor(() => {
            const checkoutRequest = global.fetch.mock.calls.find(
                ([url, options]) =>
                    url.endsWith("/api/orders/checkout") && options?.method === "POST"
            );
            expect(checkoutRequest).toBeDefined();
            expect(JSON.parse(checkoutRequest[1].body).shippingAddress).toEqual({
                fullName: "Reader",
                addressLine1: "1 Main Street",
                addressLine2: "",
                city: "Pune",
                state: "Maharashtra",
                postalCode: "411001",
                country: "India",
                phone: "9876543210"
            });
        });
        expect(await screen.findByRole("alert")).toHaveTextContent("Razorpay is not configured");
    });

    test("saves a new address and uses it for checkout", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "user-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/checkout"]);

        fireEvent.click(await screen.findByRole("button", { name: "＋ Add a new address" }));
        fireEvent.change(screen.getByLabelText("Address label"), {
            target: { value: "Office" }
        });
        fireEvent.change(screen.getByLabelText("Address line 1"), {
            target: { value: "22 Market Road" }
        });
        fireEvent.change(screen.getByLabelText("City"), {
            target: { value: "Mumbai" }
        });
        fireEvent.change(screen.getByLabelText("State / region"), {
            target: { value: "Maharashtra" }
        });
        fireEvent.change(screen.getByLabelText("Postal code"), {
            target: { value: "400001" }
        });
        fireEvent.change(screen.getByLabelText("Phone"), {
            target: { value: "9876543210" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Save address" }));

        expect(await screen.findByText("Office")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

        await waitFor(() => {
            const checkoutRequest = global.fetch.mock.calls.find(
                ([url, options]) =>
                    url.endsWith("/api/orders/checkout") && options?.method === "POST"
            );
            expect(checkoutRequest).toBeDefined();
            expect(JSON.parse(checkoutRequest[1].body).shippingAddress).toMatchObject({
                fullName: "Reader",
                addressLine1: "22 Market Road",
                city: "Mumbai",
                state: "Maharashtra",
                postalCode: "400001",
                country: "India",
                phone: "9876543210"
            });
        });
    });

    test("applies a server-validated coupon to checkout", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "user-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/checkout"]);

        fireEvent.change(await screen.findByLabelText("Coupon code"), {
            target: { value: "BOOK10" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Apply coupon" }));
        expect(await screen.findByText("Coupon BOOK10 applied.")).toBeInTheDocument();
        expect(screen.getByText("Total: ₹486.00")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

        await waitFor(() => {
            const checkoutRequest = global.fetch.mock.calls.find(
                ([url, options]) =>
                    url.endsWith("/api/orders/checkout") && options?.method === "POST"
            );
            expect(checkoutRequest).toBeDefined();
            expect(JSON.parse(checkoutRequest[1].body).couponCode).toBe("BOOK10");
        });
    });

    test("shows buyer order tracking and submits cancellation requests", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "user-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/orders"]);

        expect(await screen.findByRole("heading", { name: "Your orders" })).toBeInTheDocument();
        expect(screen.getByText("Order order-1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Request cancellation" }));
        fireEvent.change(screen.getByLabelText("Reason for cancellation"), {
            target: { value: "Ordered by mistake" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

        expect(await screen.findByText(/Cancellation: refund pending/)).toBeInTheDocument();
        const cancellationRequest = global.fetch.mock.calls.find(
            ([url, options]) =>
                url.endsWith("/api/orders/order-1/cancellation") && options?.method === "POST"
        );
        expect(JSON.parse(cancellationRequest[1].body)).toEqual({
            reason: "Ordered by mistake"
        });
    });

    test("lets a buyer request a return for a delivered order", async () => {
        const deliveredOrder = {
            ...placedOrder,
            status: "Delivered",
            trackingHistory: [
                ...placedOrder.trackingHistory,
                {
                    status: "Shipped",
                    occurredAt: "2026-10-29T10:00:00.000Z",
                    source: "shipping_partner"
                },
                {
                    status: "Out for Delivery",
                    occurredAt: "2026-10-29T12:00:00.000Z",
                    source: "shipping_partner"
                },
                {
                    status: "Delivered",
                    occurredAt: "2026-10-29T13:00:00.000Z",
                    source: "shipping_partner"
                }
            ]
        };
        const originalFetch = global.fetch.getMockImplementation();
        global.fetch.mockImplementation((url, options = {}) => {
            if (url.endsWith("/api/orders") && (!options.method || options.method === "GET")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ orders: [deliveredOrder] })
                });
            }
            if (url.endsWith("/api/orders/order-1/return")) {
                const updatedOrder = {
                    ...deliveredOrder,
                    status: "Return Requested",
                    returnRequest: {
                        type: "return",
                        status: "refund_pending",
                        reason: JSON.parse(options.body).reason
                    }
                };
                return Promise.resolve({
                    ok: true,
                    status: 202,
                    json: async () => ({ order: updatedOrder })
                });
            }
            return originalFetch(url, options);
        });
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "user-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/orders"]);

        expect(await screen.findByRole("button", { name: "Request return" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Request return" }));
        fireEvent.change(screen.getByLabelText("Reason for return"), {
            target: { value: "The book arrived damaged" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

        expect(await screen.findByText(/Return: refund pending/)).toBeInTheDocument();
        const returnRequest = global.fetch.mock.calls.find(
            ([url, options]) =>
                url.endsWith("/api/orders/order-1/return") && options?.method === "POST"
        );
        expect(JSON.parse(returnRequest[1].body)).toEqual({
            reason: "The book arrived damaged"
        });
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

    test("shows seller listing and dashboard performance", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "seller-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/seller/dashboard"]);

        expect(await screen.findByRole("heading", { name: "Seller dashboard" })).toBeInTheDocument();
        expect(screen.getByText("₹1080.00")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Clean Code" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
            "href",
            "/sell/book-1/edit"
        );
    });

    test("edits only listing fields from the seller dashboard flow", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "seller-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/sell/book-1/edit"]);

        expect(await screen.findByRole("heading", { name: "Edit listing" })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Title"), {
            target: { value: "Updated Title" }
        });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("heading", { name: "Seller dashboard" })).toBeInTheDocument();
        const [requestUrl, requestOptions] = global.fetch.mock.calls.find(
            ([url, options]) => url.endsWith("/api/books/book-1") && options?.method === "PUT"
        );
        expect(requestUrl).toBe("/api/books/book-1");
        expect(JSON.parse(requestOptions.body)).toMatchObject({
            title: "Updated Title",
            author: "Robert Martin",
            price: 540
        });
        expect(JSON.parse(requestOptions.body)).not.toHaveProperty("sellerId");
    });

    test("submits a review only when an authenticated delivered order is eligible", async () => {
        localStorage.setItem(
            "online-bookstore-auth",
            JSON.stringify({
                token: "signed-token",
                user: { id: "buyer-1", name: "Reader", email: "reader@example.com" }
            })
        );
        renderApp(["/books/book-1"]);

        expect(await screen.findByRole("heading", { name: "Review this book" })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Your review"), {
            target: { value: "A thoughtful and enjoyable read." }
        });
        fireEvent.click(screen.getByRole("button", { name: "Submit verified review" }));

        await waitFor(() => {
            const reviewRequest = global.fetch.mock.calls.find(
                ([url, options]) => url.endsWith("/api/reviews") && options?.method === "POST"
            );
            expect(reviewRequest).toBeDefined();
            expect(JSON.parse(reviewRequest[1].body)).toMatchObject({
                orderId: "delivered-order",
                bookId: "book-1",
                rating: 5,
                text: "A thoughtful and enjoyable read."
            });
        });
    });
});
