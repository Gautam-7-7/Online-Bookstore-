const API_BASE = import.meta.env.VITE_API_URL || "";

const request = async (path, token, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "Administrator request failed");
    }
    return data;
};

export const getAdminAnalytics = (token) => request("/api/admin/analytics", token);
export const getModerationQueue = (token) =>
    request("/api/admin/moderation/reports", token);
export const reviewReport = (id, action, note, token) =>
    request(`/api/admin/moderation/reports/${encodeURIComponent(id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ action, note })
    });
export const getAdminUsers = (token) => request("/api/admin/users", token);
export const updateUserStatus = (id, action, token) =>
    request(`/api/admin/users/${encodeURIComponent(id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ action })
    });
export const getAdminCoupons = (token) => request("/api/admin/coupons", token);
export const createAdminCoupon = (coupon, token) =>
    request("/api/admin/coupons", token, {
        method: "POST",
        body: JSON.stringify(coupon)
    });
export const setAdminCouponActive = (id, isActive, token) =>
    request(`/api/admin/coupons/${encodeURIComponent(id)}`, token, {
        method: "PATCH",
        body: JSON.stringify({ isActive })
    });
export const getAuditLogs = (token) => request("/api/admin/audit-logs", token);
