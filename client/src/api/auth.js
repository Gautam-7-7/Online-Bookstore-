const API_BASE = import.meta.env.VITE_API_URL || "";

const getErrorMessage = async (response) => {
    const data = await response.json().catch(() => ({}));
    return data.message || "Request failed";
};

export const getStoredToken = () => localStorage.getItem("bookstore_token");

export const saveToken = (token) => {
    localStorage.setItem("bookstore_token", token);
};

export const clearToken = () => {
    localStorage.removeItem("bookstore_token");
};

export const registerUser = async ({ name, email, password }) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
};

export const loginUser = async ({ email, password }) => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
};

export const getCurrentUser = async (token) => {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
};
