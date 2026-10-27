const API_BASE = import.meta.env.VITE_API_URL || "";

const buildHeaders = (token) => {
    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

export const registerUser = async (payload) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Registration failed");
    }

    return data;
};

export const loginUser = async (payload) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Login failed");
    }

    return data;
};

export const createBookListing = async (payload, token) => {
    const response = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Failed to create book");
    }

    return data;
};
