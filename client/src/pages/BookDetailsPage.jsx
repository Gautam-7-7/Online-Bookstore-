import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    getBookReviews,
    getReviewEligibility,
    submitBookReview,
    addCartItem
} from "../api/commerce.js";
import { getBookById } from "../api/books.js";
import { useAuth } from "../auth/AuthContext.jsx";

// Book detail page (BOOK-F-007): shows price, condition, seller, stock and
// description for one book, loaded by the :id in the URL.
export default function BookDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviewData, setReviewData] = useState({
        reviews: [],
        averageRating: 0,
        reviewCount: 0
    });
    const [eligibleOrders, setEligibleOrders] = useState([]);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [reviewRating, setReviewRating] = useState("5");
    const [reviewText, setReviewText] = useState("");
    const [reviewError, setReviewError] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [cartMessage, setCartMessage] = useState("");
    const [cartError, setCartError] = useState("");
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        let ignore = false;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const data = await getBookById(id);
                if (!ignore) {
                    setBook(data.book);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err.message);
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            ignore = true;
        };
    }, [id]);

    const refreshReviews = useCallback(async () => {
        const data = await getBookReviews(id);
        setReviewData({
            reviews: data.reviews || [],
            averageRating: data.averageRating || 0,
            reviewCount: data.reviewCount || 0
        });
    }, [id]);

    useEffect(() => {
        let ignore = false;
        const loadReviews = async () => {
            try {
                const data = await getBookReviews(id);
                if (!ignore) {
                    setReviewData({
                        reviews: data.reviews || [],
                        averageRating: data.averageRating || 0,
                        reviewCount: data.reviewCount || 0
                    });
                }
            } catch (requestError) {
                if (!ignore) {
                    setReviewError(requestError.message);
                }
            }

            if (token) {
                try {
                    const eligibility = await getReviewEligibility(id, token);
                    if (!ignore) {
                        setEligibleOrders(eligibility.eligibleOrders || []);
                        setHasReviewed(Boolean(eligibility.hasReviewed));
                        setSelectedOrderId(eligibility.eligibleOrders?.[0]?._id || "");
                    }
                } catch (requestError) {
                    if (!ignore) {
                        setReviewError(requestError.message);
                    }
                }
            }
        };
        loadReviews();
        return () => {
            ignore = true;
        };
    }, [id, token]);

    const handleReviewSubmit = async (event) => {
        event.preventDefault();
        setReviewError("");
        setReviewSubmitting(true);
        try {
            await submitBookReview(
                {
                    bookId: id,
                    orderId: selectedOrderId,
                    rating: Number(reviewRating),
                    text: reviewText
                },
                token
            );
            setReviewText("");
            setHasReviewed(true);
            setEligibleOrders([]);
            await refreshReviews();
        } catch (requestError) {
            setReviewError(requestError.message);
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleAddToCart = async () => {
        setCartMessage("");
        setCartError("");
        setAddingToCart(true);
        try {
            await addCartItem(book._id, 1, token);
            setCartMessage("Added to your cart.");
        } catch (requestError) {
            setCartError(requestError.message);
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) {
        return <p className="state state--loading">Loading book…</p>;
    }

    if (error) {
        return (
            <div className="state state--error">
                <p>{error}</p>
                <button className="btn" onClick={() => navigate("/")}>
                    ← Back to catalogue
                </button>
            </div>
        );
    }

    if (!book) {
        return null;
    }

    const inStock = book.stock > 0;

    return (
        <article className="book-details">
            <Link to="/" className="book-details__back">
                ← Back to catalogue
            </Link>

            <div className="book-details__layout">
                <div className="book-details__cover">
                    {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} />
                    ) : (
                        <span className="book-details__cover-placeholder">
                            {book.title?.charAt(0) || "?"}
                        </span>
                    )}
                </div>

                <div className="book-details__info">
                    <h1 className="book-details__title">{book.title}</h1>
                    <p className="book-details__author">by {book.author}</p>

                    <p className="book-details__price">₹{book.price}</p>
                    {token ? (
                        <button
                            className="search-bar__button"
                            disabled={!inStock || addingToCart}
                            onClick={handleAddToCart}
                        >
                            {addingToCart ? "Adding…" : "Add to cart"}
                        </button>
                    ) : (
                        <p className="form-page__hint">
                            <Link to="/login">Log in</Link> to add this book to your cart.
                        </p>
                    )}
                    {cartMessage && <p className="form-page__notice" role="status">{cartMessage}</p>}
                    {cartError && <p className="form-page__error" role="alert">{cartError}</p>}

                    <dl className="book-details__facts">
                        <div>
                            <dt>Condition</dt>
                            <dd>{book.condition}</dd>
                        </div>
                        <div>
                            <dt>Seller</dt>
                            <dd>{book.seller}</dd>
                        </div>
                        <div>
                            <dt>Availability</dt>
                            <dd
                                className={
                                    inStock ? "text-in" : "text-out"
                                }
                            >
                                {inStock
                                    ? `${book.stock} in stock`
                                    : "Out of stock"}
                            </dd>
                        </div>
                        <div>
                            <dt>Category</dt>
                            <dd>{book.category}</dd>
                        </div>
                        <div>
                            <dt>ISBN</dt>
                            <dd>{book.isbn}</dd>
                        </div>
                        {(reviewData.averageRating || book.rating) > 0 && (
                            <div>
                                <dt>Rating</dt>
                                <dd>{(reviewData.averageRating || book.rating).toFixed(1)} / 5</dd>
                            </div>
                        )}
                    </dl>

                    {book.description && (
                        <div className="book-details__description">
                            <h2>Description</h2>
                            <p>{book.description}</p>
                        </div>
                    )}
                </div>
            </div>

            <section className="book-reviews" aria-labelledby="book-reviews-heading">
                <div className="book-reviews__heading">
                    <div>
                        <h2 id="book-reviews-heading">Buyer reviews</h2>
                        <p>
                            {reviewData.reviewCount
                                ? `${reviewData.averageRating.toFixed(1)} out of 5 · ${reviewData.reviewCount} verified reviews`
                                : "No reviews yet"}
                        </p>
                    </div>
                </div>
                {reviewError && <p className="form-page__error" role="alert">{reviewError}</p>}
                {reviewData.reviews.length > 0 && (
                    <div className="review-list">
                        {reviewData.reviews.map((review) => (
                            <article className="review-card" key={review._id}>
                                <div className="review-card__heading">
                                    <strong>{review.buyer?.name || "Verified buyer"}</strong>
                                    <span>{review.rating} / 5</span>
                                </div>
                                <span className="review-card__verified">
                                    Verified purchase
                                </span>
                                <p>{review.text}</p>
                                <small>{new Date(review.createdAt).toLocaleDateString()}</small>
                            </article>
                        ))}
                    </div>
                )}
                {token && eligibleOrders.length > 0 && !hasReviewed && (
                    <form className="review-form" onSubmit={handleReviewSubmit}>
                        <h3>Review this book</h3>
                        {eligibleOrders.length > 1 && (
                            <label className="field">
                                <span>Delivered order</span>
                                <select
                                    value={selectedOrderId}
                                    onChange={(event) => setSelectedOrderId(event.target.value)}
                                >
                                    {eligibleOrders.map((order) => (
                                        <option key={order._id} value={order._id}>
                                            Order from {new Date(order.createdAt).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="field">
                            <span>Rating</span>
                            <select
                                value={reviewRating}
                                onChange={(event) => setReviewRating(event.target.value)}
                            >
                                {[5, 4, 3, 2, 1].map((rating) => (
                                    <option key={rating} value={rating}>{rating} / 5</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span>Your review</span>
                            <textarea
                                rows="4"
                                maxLength="2000"
                                required
                                value={reviewText}
                                onChange={(event) => setReviewText(event.target.value)}
                            />
                        </label>
                        <button className="search-bar__button" disabled={reviewSubmitting}>
                            {reviewSubmitting ? "Submitting…" : "Submit verified review"}
                        </button>
                    </form>
                )}
                {token && hasReviewed && (
                    <p className="state">You have already reviewed this book.</p>
                )}
                {!token && (
                    <p className="state">
                        <Link to="/login">Log in</Link> to review after a delivered purchase.
                    </p>
                )}
            </section>
        </article>
    );
}
