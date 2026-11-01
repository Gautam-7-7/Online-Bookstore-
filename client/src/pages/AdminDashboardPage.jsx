import { useCallback, useEffect, useState } from "react";
import {
    createAdminCoupon,
    getAdminAnalytics,
    getAdminCoupons,
    getAdminUsers,
    getAuditLogs,
    getModerationQueue,
    reviewReport,
    setAdminCouponActive,
    updateUserStatus
} from "../api/admin.js";
import { useAuth } from "../auth/AuthContext.jsx";

const TABS = ["Overview", "Moderation", "Accounts", "Coupons", "Audit log"];

const EMPTY_COUPON = {
    code: "",
    discountType: "percentage",
    discountValue: "",
    minimumOrderAmount: "0",
    expiresAt: "",
    maxRedemptions: ""
};

export default function AdminDashboardPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState("Overview");
    const [analytics, setAnalytics] = useState(null);
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [couponValues, setCouponValues] = useState(EMPTY_COUPON);
    const [reviewNotes, setReviewNotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadAdminData = useCallback(async () => {
        const [summary, moderation, accountData, couponData, logs] = await Promise.all([
            getAdminAnalytics(token),
            getModerationQueue(token),
            getAdminUsers(token),
            getAdminCoupons(token),
            getAuditLogs(token)
        ]);
        setAnalytics(summary);
        setReports(moderation.reports);
        setUsers(accountData.users);
        setCoupons(couponData.coupons);
        setAuditLogs(logs.auditLogs);
    }, [token]);

    useEffect(() => {
        let ignore = false;
        Promise.all([
            getAdminAnalytics(token),
            getModerationQueue(token),
            getAdminUsers(token),
            getAdminCoupons(token),
            getAuditLogs(token)
        ])
            .then(([summary, moderation, accountData, couponData, logs]) => {
                if (!ignore) {
                    setAnalytics(summary);
                    setReports(moderation.reports);
                    setUsers(accountData.users);
                    setCoupons(couponData.coupons);
                    setAuditLogs(logs.auditLogs);
                }
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(requestError.message);
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });
        return () => {
            ignore = true;
        };
    }, [token]);

    const runAction = async (action, successMessage) => {
        setError("");
        setMessage("");
        setSubmitting(true);
        try {
            await action();
            await loadAdminData();
            setMessage(successMessage);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReviewReport = (report, action) =>
        runAction(
            () => reviewReport(report._id, action, reviewNotes[report._id] || "", token),
            `Report ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "removed"}.`
        );

    const handleUserAction = (user, action) =>
        runAction(
            () => updateUserStatus(user._id, action, token),
            `Account action completed.`
        );

    const handleCouponSubmit = async (event) => {
        event.preventDefault();
        await runAction(async () => {
            await createAdminCoupon(
                {
                    ...couponValues,
                    discountValue: Number(couponValues.discountValue),
                    minimumOrderAmount: Number(couponValues.minimumOrderAmount),
                    expiresAt: new Date(couponValues.expiresAt).toISOString(),
                    ...(couponValues.maxRedemptions
                        ? { maxRedemptions: Number(couponValues.maxRedemptions) }
                        : {})
                },
                token
            );
            setCouponValues(EMPTY_COUPON);
        }, "Coupon created.");
    };

    if (loading) {
        return <p className="state state--loading">Loading administrator dashboard…</p>;
    }

    if (error && !analytics) {
        return (
            <section className="admin-page">
                <h1>Administrator dashboard</h1>
                <p className="form-page__error" role="alert">{error}</p>
            </section>
        );
    }

    if (!analytics) {
        return null;
    }

    return (
        <section className="admin-page">
            <h1>Administrator dashboard</h1>
            <p className="form-page__hint">
                Moderation, account controls, coupon administration, and audited platform analytics.
            </p>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            {message && <p className="form-page__notice" role="status">{message}</p>}

            <nav className="admin-tabs" aria-label="Administrator sections">
                {TABS.map((tab) => (
                    <button
                        className={activeTab === tab ? "admin-tab admin-tab--active" : "admin-tab"}
                        key={tab}
                        aria-current={activeTab === tab ? "page" : undefined}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {activeTab === "Overview" && (
                <>
                    <div className="seller-stats">
                        <article className="seller-stat"><span>Net revenue</span><strong>₹{analytics.netRevenue.toFixed(2)}</strong></article>
                        <article className="seller-stat"><span>Paid/refunded orders</span><strong>{analytics.orders.paidOrders}</strong></article>
                        <article className="seller-stat"><span>Active sellers</span><strong>{analytics.activeSellers}</strong></article>
                        <article className="seller-stat"><span>Verified sellers</span><strong>{analytics.users.verifiedSellers}</strong></article>
                        <article className="seller-stat"><span>Suspended accounts</span><strong>{analytics.users.suspended}</strong></article>
                        <article className="seller-stat"><span>Flagged listings</span><strong>{analytics.listings.flagged}</strong></article>
                    </div>
                    <h2>Top titles</h2>
                    {!analytics.topTitles.length ? (
                        <p className="state state--empty">No paid sales recorded yet.</p>
                    ) : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead><tr><th>Title</th><th>Units sold</th><th>Gross sales</th></tr></thead>
                                <tbody>
                                    {analytics.topTitles.map((title) => (
                                        <tr key={title._id}>
                                            <td>{title._id}</td>
                                            <td>{title.unitsSold}</td>
                                            <td>₹{title.grossSales.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === "Moderation" && (
                <div className="admin-record-list">
                    {!reports.length && <p className="state state--empty">No pending reports.</p>}
                    {reports.map((report) => (
                        <article className="admin-record" key={report._id}>
                            <h2>{report.book?.title || "Missing listing"} · {report.type.replace("_", " ")}</h2>
                            <p>{report.book?.author} · ISBN {report.book?.isbn} · Seller {report.book?.seller}</p>
                            <p><strong>Reason:</strong> {report.reason}</p>
                            <p>Reported by {report.reporter?.name || "Account"} on {new Date(report.createdAt).toLocaleString()}</p>
                            <label className="field">
                                <span>Moderator note</span>
                                <textarea
                                    rows="2"
                                    maxLength="500"
                                    value={reviewNotes[report._id] || ""}
                                    onChange={(event) =>
                                        setReviewNotes((current) => ({
                                            ...current,
                                            [report._id]: event.target.value
                                        }))
                                    }
                                />
                            </label>
                            <div className="order-card__actions">
                                {["approve", "reject", "remove"].map((action) => (
                                    <button
                                        className={action === "remove" ? "btn btn--danger" : "btn"}
                                        disabled={submitting}
                                        key={action}
                                        onClick={() => handleReviewReport(report, action)}
                                    >
                                        {action[0].toUpperCase() + action.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {activeTab === "Accounts" && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {users.map((account) => (
                                <tr key={account._id}>
                                    <td>{account.name}<br /><small>{account.email}</small></td>
                                    <td>{account.role}{account.isSellerVerified ? " · verified" : ""}</td>
                                    <td>{account.isSuspended ? "Suspended" : "Active"}</td>
                                    <td className="admin-actions">
                                        {account.role !== "admin" && (
                                            <>
                                                {account.isSuspended
                                                    ? <button className="btn" disabled={submitting} onClick={() => handleUserAction(account, "reinstate")}>Reinstate</button>
                                                    : <button className="btn btn--danger" disabled={submitting} onClick={() => handleUserAction(account, "suspend")}>Suspend</button>}
                                                {account.isSellerVerified
                                                    ? <button className="btn" disabled={submitting} onClick={() => handleUserAction(account, "unverify_seller")}>Unverify seller</button>
                                                    : <button className="btn" disabled={submitting} onClick={() => handleUserAction(account, "verify_seller")}>Verify seller</button>}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "Coupons" && (
                <>
                    <form className="form-card form-card--grid admin-coupon-form" onSubmit={handleCouponSubmit}>
                        <label className="field"><span>Code</span><input required maxLength="32" value={couponValues.code} onChange={(event) => setCouponValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></label>
                        <label className="field"><span>Discount type</span><select value={couponValues.discountType} onChange={(event) => setCouponValues((current) => ({ ...current, discountType: event.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
                        <label className="field"><span>Discount value</span><input type="number" min="0.01" step="0.01" max={couponValues.discountType === "percentage" ? "100" : undefined} required value={couponValues.discountValue} onChange={(event) => setCouponValues((current) => ({ ...current, discountValue: event.target.value }))} /></label>
                        <label className="field"><span>Minimum order amount</span><input type="number" min="0" step="0.01" value={couponValues.minimumOrderAmount} onChange={(event) => setCouponValues((current) => ({ ...current, minimumOrderAmount: event.target.value }))} /></label>
                        <label className="field"><span>Expires at</span><input type="datetime-local" required value={couponValues.expiresAt} onChange={(event) => setCouponValues((current) => ({ ...current, expiresAt: event.target.value }))} /></label>
                        <label className="field"><span>Maximum redemptions (optional)</span><input type="number" min="1" step="1" value={couponValues.maxRedemptions} onChange={(event) => setCouponValues((current) => ({ ...current, maxRedemptions: event.target.value }))} /></label>
                        <button className="search-bar__button form-card__full" disabled={submitting}>{submitting ? "Saving…" : "Create coupon"}</button>
                    </form>
                    <div className="admin-record-list">
                        {coupons.map((coupon) => (
                            <article className="admin-record admin-coupon" key={coupon._id}>
                                <div><h2>{coupon.code}</h2><p>{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} · expires {new Date(coupon.expiresAt).toLocaleDateString()} · used {coupon.redemptionCount}{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}</p><p>{coupon.isActive ? "Active" : "Inactive"}</p></div>
                                <button className="btn" disabled={submitting} onClick={() => runAction(() => setAdminCouponActive(coupon._id, !coupon.isActive, token), `Coupon ${coupon.isActive ? "deactivated" : "activated"}.`)}>{coupon.isActive ? "Deactivate" : "Activate"}</button>
                            </article>
                        ))}
                    </div>
                </>
            )}

            {activeTab === "Audit log" && (
                <div className="admin-record-list">
                    {!auditLogs.length && <p className="state state--empty">No administrator actions recorded.</p>}
                    {auditLogs.map((entry) => (
                        <article className="admin-record" key={entry._id}>
                            <strong>{entry.action}</strong>
                            <p>{entry.targetType} {entry.targetId} · by {entry.actor?.name || "Administrator"} · {new Date(entry.createdAt).toLocaleString()}</p>
                            {!!Object.keys(entry.details || {}).length && (
                                <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
