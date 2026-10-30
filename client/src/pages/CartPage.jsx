import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCart, removeCartItem } from "../api/commerce.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function CartPage() {
    const { token } = useAuth();
    const [cart, setCart] = useState({ items: [] });
    const [subtotal, setSubtotal] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const refreshCart = useCallback(async () => {
        const data = await getCart(token);
        setCart(data.cart || { items: [] });
        setSubtotal(data.subtotal || 0);
    }, [token]);

    useEffect(() => {
        let ignore = false;
        getCart(token)
            .then((data) => {
                if (!ignore) {
                    setCart(data.cart || { items: [] });
                    setSubtotal(data.subtotal || 0);
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

    const handleRemove = async (bookId) => {
        setError("");
        try {
            await removeCartItem(bookId, token);
            await refreshCart();
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    if (loading) {
        return <p className="state state--loading">Loading your cart…</p>;
    }

    return (
        <section className="checkout-page">
            <h1>Your cart</h1>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            {!cart.items.length ? (
                <div className="checkout-empty">
                    <p>Your cart is empty.</p>
                    <Link className="search-bar__button" to="/">Browse books</Link>
                </div>
            ) : (
                <>
                    <div className="cart-items">
                        {cart.items.map(({ book, quantity, lineTotal }) => (
                            <article className="cart-item" key={book._id}>
                                <div>
                                    <Link to={`/books/${book._id}`}><h2>{book.title}</h2></Link>
                                    <p>{book.author}</p>
                                    <p>₹{book.price} × {quantity} = ₹{lineTotal.toFixed(2)}</p>
                                </div>
                                <button
                                    className="btn btn--danger"
                                    onClick={() => handleRemove(book._id)}
                                >
                                    Remove
                                </button>
                            </article>
                        ))}
                    </div>
                    <div className="cart-summary">
                        <strong>Subtotal: ₹{subtotal.toFixed(2)}</strong>
                        <Link className="search-bar__button" to="/checkout">
                            Continue to shipping
                        </Link>
                    </div>
                </>
            )}
        </section>
    );
}
