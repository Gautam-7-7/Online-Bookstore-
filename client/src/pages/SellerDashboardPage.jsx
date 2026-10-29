import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    getSellerDashboard,
    getSellerListings,
    removeSellerListing
} from "../api/commerce.js";
import { useAuth } from "../auth/AuthContext.jsx";

const EMPTY_DASHBOARD = {
    listings: { totalListings: 0, activeListings: 0, totalStock: 0 },
    sales: { orders: 0, unitsSold: 0, revenue: 0 },
    rating: { averageRating: 0, reviewCount: 0 }
};

export default function SellerDashboardPage() {
    const { token } = useAuth();
    const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
    const [books, setBooks] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        setError("");
        const [summary, listings] = await Promise.all([
            getSellerDashboard(token),
            getSellerListings(token)
        ]);
        setDashboard(summary);
        setBooks(listings.books);
    }, [token]);

    useEffect(() => {
        let ignore = false;
        Promise.all([getSellerDashboard(token), getSellerListings(token)])
            .then(([summary, listings]) => {
                if (!ignore) {
                    setDashboard(summary);
                    setBooks(listings.books);
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

    const handleRemove = async (book) => {
        if (!window.confirm(`Remove "${book.title}" from the catalogue?`)) {
            return;
        }
        try {
            await removeSellerListing(book._id, token);
            await loadDashboard();
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    if (loading) {
        return <p className="state state--loading">Loading seller dashboard…</p>;
    }

    return (
        <section className="seller-dashboard">
            <div className="seller-dashboard__heading">
                <div>
                    <h1>Seller dashboard</h1>
                    <p>Manage your listings and review your store performance.</p>
                </div>
                <Link className="search-bar__button" to="/sell">List a book</Link>
            </div>
            {error && <p className="form-page__error" role="alert">{error}</p>}

            <div className="seller-stats">
                <article className="seller-stat">
                    <span>Active listings</span>
                    <strong>{dashboard.listings.activeListings}</strong>
                </article>
                <article className="seller-stat">
                    <span>Units in stock</span>
                    <strong>{dashboard.listings.totalStock}</strong>
                </article>
                <article className="seller-stat">
                    <span>Units sold</span>
                    <strong>{dashboard.sales.unitsSold}</strong>
                </article>
                <article className="seller-stat">
                    <span>Net sales after discounts</span>
                    <strong>₹{dashboard.sales.revenue.toFixed(2)}</strong>
                </article>
                <article className="seller-stat">
                    <span>Store rating</span>
                    <strong>
                        {dashboard.rating.averageRating.toFixed(1)} / 5
                        <small> ({dashboard.rating.reviewCount} reviews)</small>
                    </strong>
                </article>
            </div>

            <div className="seller-dashboard__listings-heading">
                <h2>Your listings ({dashboard.listings.totalListings})</h2>
                <Link to="/sell">Add another book</Link>
            </div>
            {!books.length ? (
                <p className="state state--empty">You have not created any listings yet.</p>
            ) : (
                <div className="seller-listings">
                    {books.map((book) => (
                        <article className="seller-listing" key={book._id}>
                            <div>
                                <h3>{book.title}</h3>
                                <p>{book.author} · ISBN {book.isbn}</p>
                                <p>₹{book.price} · Stock: {book.stock}</p>
                                <span className={book.isActive ? "seller-listing__active" : "seller-listing__inactive"}>
                                    {book.isActive ? "Active" : "Removed"}
                                </span>
                            </div>
                            <div className="seller-listing__actions">
                                {book.isActive && (
                                    <>
                                        <Link to={`/sell/${book._id}/edit`}>Edit</Link>
                                        <button
                                            className="btn btn--danger"
                                            onClick={() => handleRemove(book)}
                                        >
                                            Remove
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
