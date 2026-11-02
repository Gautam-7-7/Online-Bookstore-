const API_BASE = import.meta.env.VITE_API_URL || "";

const request = async (path, token, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Account request failed");
    }
    return data;
};

export const getProfile = (token) => request("/api/account/me", token);
export const updateProfile = (values, token) =>
    request("/api/account/me", token, {
        method: "PATCH",
        body: JSON.stringify(values)
    });

export const requestPasswordReset = (email) =>
    request("/api/account/password/forgot", null, {
        method: "POST",
        body: JSON.stringify({ email })
    });

export const resetPassword = (token, password) =>
    request("/api/account/password/reset", null, {
        method: "POST",
        body: JSON.stringify({ token, password })
    });
