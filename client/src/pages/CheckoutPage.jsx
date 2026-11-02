import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    createShippingAddress,
    deleteShippingAddress,
    getCart,
    getShippingAddresses,
    openRazorpayCheckout,
    setDefaultShippingAddress,
    validateCoupon
} from "../api/commerce.js";
import { useAuth } from "../auth/AuthContext.jsx";

const EMPTY_ADDRESS = {
    label: "",
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    phone: "",
    isDefault: false
};
const SHIPPING_FIELDS = [
    "fullName",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "phone"
];
const newIdempotencyKey = () => globalThis.crypto.randomUUID();

export default function CheckoutPage() {
    const { token, user } = useAuth();
    const [cart, setCart] = useState({ items: [] });
    const [subtotal, setSubtotal] = useState(0);
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const [addressValues, setAddressValues] = useState({
        ...EMPTY_ADDRESS,
        fullName: user?.name || ""
    });
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [savingAddress, setSavingAddress] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
    const [confirmedOrder, setConfirmedOrder] = useState(null);

    const selectedAddress = useMemo(
        () => addresses.find((address) => address._id === selectedAddressId),
        [addresses, selectedAddressId]
    );

    const refreshAddresses = useCallback(async () => {
        const data = await getShippingAddresses(token);
        const nextAddresses = data.addresses || [];
        setAddresses(nextAddresses);
        setSelectedAddressId((current) =>
            nextAddresses.some((address) => address._id === current)
                ? current
                : nextAddresses.find((address) => address.isDefault)?._id ||
                  nextAddresses[0]?._id ||
                  ""
        );
        return nextAddresses;
    }, [token]);

    useEffect(() => {
        let ignore = false;
        Promise.all([getCart(token), getShippingAddresses(token)])
            .then(([cartData, addressData]) => {
                if (ignore) {
                    return;
                }
                setCart(cartData.cart || { items: [] });
                setSubtotal(cartData.subtotal || 0);
                const nextAddresses = addressData.addresses || [];
                setAddresses(nextAddresses);
                setSelectedAddressId(
                    nextAddresses.find((address) => address.isDefault)?._id ||
                        nextAddresses[0]?._id ||
                        ""
                );
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

    const updateAddressField = (event) => {
        const { name, value, checked, type } = event.target;
        setAddressValues((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSaveAddress = async (event) => {
        event.preventDefault();
        setError("");
        setSavingAddress(true);
        try {
            const result = await createShippingAddress(addressValues, token);
            await refreshAddresses();
            setSelectedAddressId(result.address._id);
            setShowAddressForm(false);
            setAddressValues({ ...EMPTY_ADDRESS, fullName: user?.name || "" });
            setIdempotencyKey(newIdempotencyKey());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSavingAddress(false);
        }
    };

    const handleSetDefault = async (addressId) => {
        setError("");
        try {
            await setDefaultShippingAddress(addressId, token);
            await refreshAddresses();
            setSelectedAddressId(addressId);
            setIdempotencyKey(newIdempotencyKey());
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const handleDeleteAddress = async (addressId) => {
        setError("");
        try {
            await deleteShippingAddress(addressId, token);
            await refreshAddresses();
            setIdempotencyKey(newIdempotencyKey());
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const handleApplyCoupon = async (event) => {
        event.preventDefault();
        setError("");
        setValidatingCoupon(true);
        try {
            const result = await validateCoupon(couponCode.trim(), token);
            setAppliedCoupon(result);
            setIdempotencyKey(newIdempotencyKey());
        } catch (requestError) {
            setAppliedCoupon(null);
            setError(requestError.message);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleCheckout = async () => {
        if (!selectedAddress) {
            setError("Choose or add a shipping address before continuing.");
            return;
        }
        setError("");
        setSubmitting(true);
        try {
            const shippingAddress = Object.fromEntries(
                SHIPPING_FIELDS.map((field) => [field, selectedAddress[field] || ""])
            );
            const result = await openRazorpayCheckout({
                token,
                shippingAddress,
                couponCode: appliedCoupon?.code,
                idempotencyKey,
                customer: {
                    name: selectedAddress.fullName,
                    email: user?.email,
                    phone: selectedAddress.phone
                },
                onDismiss: () => {}
            });
            setConfirmedOrder(result.order);
        } catch (requestError) {
            setError(requestError.message);
            if (requestError.idempotencyKey) {
                setIdempotencyKey(requestError.idempotencyKey);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="state state--loading">Loading checkout…</p>;
    }
    if (error && !cart.items.length) {
        return (
            <section className="checkout-page">
                <p className="form-page__error" role="alert">{error}</p>
                <Link to="/cart">Return to cart</Link>
            </section>
        );
    }
    if (!cart.items.length && !confirmedOrder) {
        return (
            <section className="checkout-page checkout-empty">
                <h1>Your cart is empty</h1>
                <Link className="search-bar__button" to="/">Browse books</Link>
            </section>
        );
    }

    if (confirmedOrder) {
        return (
            <section className="checkout-page">
                <h1>Order confirmed</h1>
                <p>Your payment was verified and your order has been placed.</p>
                <p>Order ID: {confirmedOrder._id}</p>
                <Link className="search-bar__button" to="/orders">View your orders</Link>
                <Link className="search-bar__button" to="/">Continue browsing</Link>
            </section>
        );
    }

    return (
        <section className="checkout-page">
            <Link to="/cart" className="book-details__back">← Back to cart</Link>
            <h1>Shipping address</h1>
            <p className="form-page__hint">
                Choose where this order should be delivered, or add a new saved address.
            </p>
            {error && <p className="form-page__error" role="alert">{error}</p>}

            {addresses.length > 0 && (
                <div className="address-list" role="radiogroup" aria-label="Saved shipping addresses">
                    {addresses.map((address) => (
                        <article
                            className={`address-card${selectedAddressId === address._id ? " address-card--selected" : ""}`}
                            key={address._id}
                        >
                            <label className="address-card__choice">
                                <input
                                    type="radio"
                                    name="shippingAddress"
                                    value={address._id}
                                    checked={selectedAddressId === address._id}
                                    onChange={() => {
                                        setSelectedAddressId(address._id);
                                        setIdempotencyKey(newIdempotencyKey());
                                    }}
                                />
                                <span>
                                    <strong>{address.label}</strong>
                                    {address.isDefault && <small>Default</small>}
                                </span>
                            </label>
                            <address>
                                {address.fullName}<br />
                                {address.addressLine1}
                                {address.addressLine2 && <><br />{address.addressLine2}</>}<br />
                                {address.city}, {address.state} {address.postalCode}<br />
                                {address.country}<br />
                                Phone: {address.phone}
                            </address>
                            <div className="address-card__actions">
                                {!address.isDefault && (
                                    <button
                                        className="site-header__button"
                                        onClick={() => handleSetDefault(address._id)}
                                    >
                                        Set as default
                                    </button>
                                )}
                                <button
                                    className="site-header__button address-card__delete"
                                    onClick={() => handleDeleteAddress(address._id)}
                                >
                                    Remove
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <button
                className="btn"
                onClick={() => {
                    setShowAddressForm((current) => !current);
                    setIdempotencyKey(newIdempotencyKey());
                }}
            >
                {showAddressForm ? "Cancel adding address" : "＋ Add a new address"}
            </button>

            {showAddressForm && (
                <form className="form-card form-card--grid address-form" onSubmit={handleSaveAddress}>
                    <label className="field">
                        <span>Address label</span>
                        <input
                            name="label"
                            placeholder="Home, Work…"
                            maxLength="40"
                            required
                            value={addressValues.label}
                            onChange={updateAddressField}
                        />
                    </label>
                    <label className="field">
                        <span>Full name</span>
                        <input name="fullName" required value={addressValues.fullName} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>Address line 1</span>
                        <input name="addressLine1" required value={addressValues.addressLine1} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>Address line 2 (optional)</span>
                        <input name="addressLine2" value={addressValues.addressLine2} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>City</span>
                        <input name="city" required value={addressValues.city} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>State / region</span>
                        <input name="state" required value={addressValues.state} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>Postal code</span>
                        <input name="postalCode" required value={addressValues.postalCode} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>Country</span>
                        <input name="country" required value={addressValues.country} onChange={updateAddressField} />
                    </label>
                    <label className="field">
                        <span>Phone</span>
                        <input name="phone" type="tel" required value={addressValues.phone} onChange={updateAddressField} />
                    </label>
                    <label className="address-form__default">
                        <input
                            type="checkbox"
                            name="isDefault"
                            checked={addressValues.isDefault}
                            onChange={updateAddressField}
                        />
                        Save as my default address
                    </label>
                    <button className="search-bar__button form-card__full" disabled={savingAddress}>
                        {savingAddress ? "Saving address…" : "Save address"}
                    </button>
                </form>
            )}

            <aside className="checkout-summary">
                <h2>Order summary</h2>
                {cart.items.map(({ book, quantity, lineTotal }) => (
                    <div className="checkout-summary__line" key={book._id}>
                        <span>{book.title} × {quantity}</span>
                        <span>₹{lineTotal.toFixed(2)}</span>
                    </div>
                ))}
                <strong>Subtotal: ₹{subtotal.toFixed(2)}</strong>
                <form className="coupon-form" onSubmit={handleApplyCoupon}>
                    <label className="field">
                        <span>Coupon code</span>
                        <input
                            value={couponCode}
                            maxLength="32"
                            onChange={(event) => {
                                setCouponCode(event.target.value);
                                setAppliedCoupon(null);
                                setIdempotencyKey(newIdempotencyKey());
                            }}
                        />
                    </label>
                    <button className="btn" disabled={validatingCoupon || !couponCode.trim()}>
                        {validatingCoupon ? "Checking…" : "Apply coupon"}
                    </button>
                </form>
                {appliedCoupon && (
                    <>
                        <p className="form-page__notice" role="status">
                            Coupon {appliedCoupon.code} applied.
                        </p>
                        <div className="checkout-summary__line">
                            <span>Discount</span>
                            <span>−₹{appliedCoupon.discount.toFixed(2)}</span>
                        </div>
                        <strong>Total: ₹{appliedCoupon.total.toFixed(2)}</strong>
                    </>
                )}
                <button
                    className="search-bar__button"
                    disabled={submitting || !selectedAddress}
                    onClick={handleCheckout}
                >
                    {submitting ? "Opening secure checkout…" : "Continue to payment"}
                </button>
            </aside>
        </section>
    );
}
