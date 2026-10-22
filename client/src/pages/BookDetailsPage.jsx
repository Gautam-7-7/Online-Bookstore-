import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBookById } from "../api/books.js";

// Book detail page (BOOK-F-007): shows price, condition, seller, stock and
// description for one book, loaded by the :id in the URL.
export default function BookDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                        {book.rating > 0 && (
                            <div>
                                <dt>Rating</dt>
                                <dd>{book.rating.toFixed(1)} / 5</dd>
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
        </article>
    );
}
