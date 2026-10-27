// Central place for all catalogue API calls. Every component talks to the
// backend through these functions, so the fetch logic lives in one spot.

// If VITE_API_URL is set we call it directly; otherwise we use a relative
// path and let the Vite dev proxy (see vite.config.js) forward /api to the
// backend. In a production build you would set VITE_API_URL to the deployed
// API URL.
const API_BASE = import.meta.env.VITE_API_URL || "";

// Turn a filters object into a query string, skipping empty values.
const buildQuery = (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.append(key, value);
        }
    });

    const str = query.toString();
    return str ? `?${str}` : "";
};

// GET /api/books with optional { search, category, sort, minPrice, maxPrice, page, limit }
export const getBooks = async (params = {}) => {
    const response = await fetch(`${API_BASE}/api/books${buildQuery(params)}`);

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load books");
    }

    return response.json();
};

// GET /api/books/:id
export const getBookById = async (id) => {
    const response = await fetch(`${API_BASE}/api/books/${id}`);

    if (response.status === 404) {
        throw new Error("Book not found");
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load book");
    }

    return response.json();
};

// POST /api/books. The backend derives seller from the authenticated user.
export const createBook = async (book, token) => {
    const response = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(book)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Failed to create book");
    }

    return data;
};
