import { createBook } from "./books.js";

const API_BASE = import.meta.env.VITE_API_URL || "";

const request = async (path, details, fallbackMessage) => {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || fallbackMessage);
    }

    return data;
};

export const register = (details) =>
    request("/api/auth/register", details, "Registration failed");

export const login = (credentials) =>
    request("/api/auth/login", credentials, "Login failed");

export const registerUser = register;
export const loginUser = login;

export const createBookListing = (details, token) => {
    const book = { ...details };
    delete book.seller;
    return createBook(book, token);
};
