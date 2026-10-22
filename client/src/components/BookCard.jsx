import { Link } from "react-router-dom";

// A single book tile shown in the catalogue grid. Clicking it opens the
// detail page. Kept presentational — it only receives a book and renders it.
export default function BookCard({ book }) {
    const inStock = book.stock > 0;

    return (
        <Link to={`/books/${book._id}`} className="book-card">
            <div className="book-card__cover">
                {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} />
                ) : (
                    <span className="book-card__cover-placeholder">
                        {book.title?.charAt(0) || "?"}
                    </span>
                )}
            </div>

            <div className="book-card__body">
                <h3 className="book-card__title">{book.title}</h3>
                <p className="book-card__author">{book.author}</p>

                <div className="book-card__meta">
                    <span className="book-card__price">₹{book.price}</span>
                    <span
                        className={
                            "book-card__stock " +
                            (inStock
                                ? "book-card__stock--in"
                                : "book-card__stock--out")
                        }
                    >
                        {inStock ? "In stock" : "Out of stock"}
                    </span>
                </div>

                {book.category && (
                    <span className="book-card__category">{book.category}</span>
                )}
            </div>
        </Link>
    );
}
