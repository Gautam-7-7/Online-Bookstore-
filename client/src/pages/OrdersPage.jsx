import { useCallback, useEffect, useState } from "react";
import {
    getOrders,
    requestCancellation,
    requestReturn
} from "../api/commerce.js";
import { useAuth } from "../auth/AuthContext.jsx";

const formatDate = (value) => new Date(value).toLocaleString();
const money = (value, currency = "INR") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);

export default function OrdersPage() {
    const { token } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeRequest, setActiveRequest] = useState(null);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const loadOrders = useCallback(async () => {
        const data = await getOrders(token);
        setOrders(data.orders || []);
    }, [token]);

    useEffect(() => {
        let ignore = false;
        getOrders(token)
            .then((data) => {
                if (!ignore) {
                    setOrders(data.orders || []);
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

    const handleRequest = async (event) => {
        event.preventDefault();
        if (!activeRequest || !reason.trim()) {
            setError("Enter a reason to continue.");
            return;
        }
        setError("");
        setSubmitting(true);
        try {
            const submit = activeRequest.type === "cancellation"
                ? requestCancellation
                : requestReturn;
            const result = await submit(activeRequest.orderId, reason.trim(), token);
            if (result.order) {
                setOrders((current) =>
                    current.map((order) =>
                        order._id === result.order._id ? result.order : order
                    )
                );
            } else {
                await loadOrders();
            }
            setActiveRequest(null);
            setReason("");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="state state--loading">Loading your orders…</p>;
    }

    return (
        <section className="orders-page">
            <h1>Your orders</h1>
            <p className="form-page__hint">Review order status and delivery updates.</p>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            {!orders.length ? (
                <p className="state state--empty">You have not placed any orders yet.</p>
            ) : (
                <div className="order-list">
                    {orders.map((order) => {
                        const paymentSucceeded = order.payment?.status === "succeeded";
                        const requestPending = Boolean(order.returnRequest?.type);
                        return (
                            <article className="order-card" key={order._id}>
                                <header className="order-card__header">
                                    <div>
                                        <h2>Order {order._id}</h2>
                                        <p>Placed {formatDate(order.createdAt)}</p>
                                    </div>
                                    <span className="order-status">{order.status}</span>
                                </header>

                                <div className="order-card__items">
                                    {order.items.map((item, index) => (
                                        <div
                                            className="order-card__line"
                                            key={`${item.book}-${index}`}
                                        >
                                            <span>{item.title} × {item.quantity}</span>
                                            <span>{money(item.unitPrice * item.quantity, order.currency)}</span>
                                        </div>
                                    ))}
                                    {order.discount > 0 && (
                                        <div className="order-card__line">
                                            <span>Discount{order.coupon?.code ? ` (${order.coupon.code})` : ""}</span>
                                            <span>−{money(order.discount, order.currency)}</span>
                                        </div>
                                    )}
                                    <strong>Total: {money(order.total, order.currency)}</strong>
                                </div>

                                <div className="order-card__details">
                                    <div>
                                        <h3>Shipping address</h3>
                                        <p>
                                            {order.shippingAddress.fullName}<br />
                                            {order.shippingAddress.addressLine1}
                                            {order.shippingAddress.addressLine2 && <><br />{order.shippingAddress.addressLine2}</>}<br />
                                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}<br />
                                            {order.shippingAddress.country}
                                        </p>
                                    </div>
                                    <div>
                                        <h3>Payment</h3>
                                        <p>{order.payment?.status || "pending"}</p>
                                        {order.payment?.transactionId && (
                                            <small>Reference: {order.payment.transactionId}</small>
                                        )}
                                    </div>
                                </div>

                                {!!order.trackingHistory?.length && (
                                    <ol className="order-timeline" aria-label="Order tracking history">
                                        {order.trackingHistory.map((event, index) => (
                                            <li key={`${event.status}-${event.occurredAt}-${index}`}>
                                                <strong>{event.status}</strong>
                                                <time dateTime={event.occurredAt}>
                                                    {formatDate(event.occurredAt)}
                                                </time>
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                {order.returnRequest?.type && (
                                    <p className="order-card__request" role="status">
                                        {order.returnRequest.type === "return" ? "Return" : "Cancellation"}:
                                        {" "}{order.returnRequest.status?.replaceAll("_", " ")}
                                    </p>
                                )}

                                {!requestPending && paymentSucceeded && (
                                    <div className="order-card__actions">
                                        {order.status === "Placed" && (
                                            <button
                                                className="btn btn--danger"
                                                onClick={() => {
                                                    setActiveRequest({ orderId: order._id, type: "cancellation" });
                                                    setReason("");
                                                }}
                                            >
                                                Request cancellation
                                            </button>
                                        )}
                                        {order.status === "Delivered" && (
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    setActiveRequest({ orderId: order._id, type: "return" });
                                                    setReason("");
                                                }}
                                            >
                                                Request return
                                            </button>
                                        )}
                                    </div>
                                )}

                                {activeRequest?.orderId === order._id && (
                                    <form className="order-request-form" onSubmit={handleRequest}>
                                        <label className="field">
                                            <span>
                                                Reason for {activeRequest.type === "return" ? "return" : "cancellation"}
                                            </span>
                                            <textarea
                                                required
                                                maxLength="500"
                                                rows="3"
                                                value={reason}
                                                onChange={(event) => setReason(event.target.value)}
                                            />
                                        </label>
                                        {activeRequest.type === "return" && (
                                            <p className="form-page__hint">
                                                Return eligibility is checked against the configured delivery window.
                                            </p>
                                        )}
                                        <div className="order-card__actions">
                                            <button className="search-bar__button" disabled={submitting}>
                                                {submitting ? "Submitting…" : "Submit request"}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn"
                                                disabled={submitting}
                                                onClick={() => setActiveRequest(null)}
                                            >
                                                Keep order
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
