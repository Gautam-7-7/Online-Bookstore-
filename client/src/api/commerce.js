const API_BASE = import.meta.env.VITE_API_URL || "";
const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

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
        throw new Error(data.message || "Commerce request failed");
    }
    return data;
};

export const getBookReviews = (bookId) =>
    request(`/api/reviews/books/${encodeURIComponent(bookId)}`);

export const getReviewEligibility = (bookId, token) =>
    request(
        `/api/reviews/eligibility/${encodeURIComponent(bookId)}`,
        token
    );

export const submitBookReview = (review, token) =>
    request("/api/reviews", token, {
        method: "POST",
        body: JSON.stringify(review)
    });

export const getOrders = (token) => request("/api/orders", token);

export const getSellerDashboard = (token) =>
    request("/api/books/seller/dashboard", token);

export const getSellerListings = (token) =>
    request("/api/books/mine", token);

export const getSellerListing = (bookId, token) =>
    request(`/api/books/mine/${encodeURIComponent(bookId)}`, token);

export const updateSellerListing = (bookId, values, token) =>
    request(`/api/books/${encodeURIComponent(bookId)}`, token, {
        method: "PUT",
        body: JSON.stringify(values)
    });

export const removeSellerListing = (bookId, token) =>
    request(`/api/books/${encodeURIComponent(bookId)}`, token, {
        method: "DELETE"
    });

const loadRazorpayCheckout = () =>
    new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve();
            return;
        }

        const existingScript = document.querySelector(
            `script[src="${RAZORPAY_CHECKOUT_URL}"]`
        );
        if (existingScript) {
            if (existingScript.dataset.loaded === "true") {
                reject(new Error("Razorpay Checkout did not initialize"));
                return;
            }
            existingScript.addEventListener("load", resolve, { once: true });
            existingScript.addEventListener(
                "error",
                () => reject(new Error("Razorpay Checkout failed to load")),
                { once: true }
            );
            return;
        }

        const script = document.createElement("script");
        script.src = RAZORPAY_CHECKOUT_URL;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = "true";
            resolve();
        };
        script.onerror = () => reject(new Error("Razorpay Checkout failed to load"));
        document.body.appendChild(script);
    });

export const createPaymentOrder = (
    { shippingAddress, couponCode },
    token,
    idempotencyKey = globalThis.crypto.randomUUID()
) =>
    request("/api/orders/checkout", token, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ shippingAddress, ...(couponCode ? { couponCode } : {}) })
    });

export const verifyPayment = (orderId, payment, token) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/payment/verify`, token, {
        method: "POST",
        body: JSON.stringify({
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_signature: payment.razorpay_signature
        })
    });

export const reportPaymentFailure = (orderId, payment, token) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/payment/failure`, token, {
        method: "POST",
        body: JSON.stringify({
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_order_id: payment.razorpay_order_id
        })
    });

export const requestCancellation = (orderId, reason, token) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/cancellation`, token, {
        method: "POST",
        body: JSON.stringify({ reason })
    });

export const requestReturn = (orderId, reason, token) =>
    request(`/api/orders/${encodeURIComponent(orderId)}/return`, token, {
        method: "POST",
        body: JSON.stringify({ reason })
    });

export const openRazorpayCheckout = async ({
    token,
    shippingAddress,
    couponCode,
    idempotencyKey = globalThis.crypto.randomUUID(),
    customer = {},
    onDismiss = () => {}
}) => {
    const created = await createPaymentOrder(
        { shippingAddress, couponCode },
        token,
        idempotencyKey
    );
    await loadRazorpayCheckout();

    return new Promise((resolve, reject) => {
        let completed = false;
        const checkout = created.checkout;
        const finish = (callback, value) => {
            if (completed) {
                return;
            }
            completed = true;
            callback(value);
        };
        const options = {
            key: checkout.keyId,
            amount: checkout.amount,
            currency: checkout.currency,
            name: checkout.name,
            description: checkout.description,
            order_id: checkout.orderId,
            prefill: {
                name: customer.name || "",
                email: customer.email || "",
                contact: customer.phone || ""
            },
            handler: async (payment) => {
                try {
                    const result = await verifyPayment(
                        checkout.localOrderId,
                        payment,
                        token
                    );
                    finish(resolve, result);
                } catch (error) {
                    finish(reject, error);
                }
            },
            modal: {
                ondismiss: () => {
                    onDismiss({
                        orderId: checkout.localOrderId,
                        idempotencyKey
                    });
                    const error = new Error(
                        "Payment window closed. Reuse the same checkout key to retry."
                    );
                    error.idempotencyKey = idempotencyKey;
                    finish(reject, error);
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", async ({ error } = {}) => {
            const details = {
                razorpay_payment_id: error?.metadata?.payment_id,
                razorpay_order_id: error?.metadata?.order_id
            };
            let reconciliationError;
            if (details.razorpay_payment_id && details.razorpay_order_id) {
                try {
                    await reportPaymentFailure(
                        checkout.localOrderId,
                        details,
                        token
                    );
                } catch (error) {
                    reconciliationError = error;
                }
            }
            const failure = new Error(
                error?.description || "Razorpay payment failed"
            );
            failure.idempotencyKey = idempotencyKey;
            if (reconciliationError) {
                failure.reconciliationError = reconciliationError;
            }
            finish(reject, failure);
        });
        razorpay.open();
    });
};
