const API_BASE = import.meta.env.VITE_API_URL || "";

const request = async (path, options) => {
    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
};

export const register = (details) =>
    request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details)
    });

export const login = (credentials) =>
    request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
    });
