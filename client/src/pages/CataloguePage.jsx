import { useEffect, useState } from "react";
import { getBooks } from "../api/books.js";
import BookCard from "../components/BookCard.jsx";
import SearchBar from "../components/SearchBar.jsx";

const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "rating_desc", label: "Top Rated" }
];

export default function CataloguePage() {
    const [books, setBooks] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [sort, setSort] = useState("newest");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBooks, setTotalBooks] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Re-fetch whenever a filter or the page changes.
    useEffect(() => {
        let ignore = false;

        const load = async () => {
            setLoading(true);
            setError("");

            try {
                const data = await getBooks({
                    search,
                    category,
                    sort,
                    page,
                    limit: 12
                });

                if (!ignore) {
                    setBooks(data.books);
                    setTotalPages(data.totalPages);
                    setTotalBooks(data.totalBooks);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err.message);
                    setBooks([]);
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        load();

        // Avoid setting state from a stale request if filters change fast.
        return () => {
            ignore = true;
        };
    }, [search, category, sort, page]);

    // Any filter change resets back to page 1.
    const handleSearch = (value) => {
        setPage(1);
        setSearch(value);
    };

    const handleCategory = (value) => {
        setPage(1);
        setCategory(value);
    };

    const handleSort = (value) => {
        setPage(1);
        setSort(value);
    };

    // Build a simple category list from whatever came back, so the dropdown
    // reflects real data without a separate endpoint.
    const categories = Array.from(
        new Set(books.map((b) => b.category).filter(Boolean))
    );

    return (
        <section className="catalogue">
            <h1 className="catalogue__heading">Browse Books</h1>

            <div className="catalogue__controls">
                <SearchBar initialValue={search} onSearch={handleSearch} />

                <div className="catalogue__filters">
                    <label className="field">
                        <span className="field__label">Category</span>
                        <select
                            value={category}
                            onChange={(e) => handleCategory(e.target.value)}
                        >
                            <option value="">All categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="field">
                        <span className="field__label">Sort by</span>
                        <select
                            value={sort}
                            onChange={(e) => handleSort(e.target.value)}
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            {/* Loading state */}
            {loading && <p className="state state--loading">Loading books…</p>}

            {/* Error state */}
            {!loading && error && (
                <div className="state state--error">
                    <p>Could not load books: {error}</p>
                    <p className="state__hint">
                        Make sure the backend is running on port 5000.
                    </p>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && books.length === 0 && (
                <p className="state state--empty">
                    No books found{search ? ` for “${search}”` : ""}.
                </p>
            )}

            {/* Results */}
            {!loading && !error && books.length > 0 && (
                <>
                    <p className="catalogue__count">
                        Showing {books.length} of {totalBooks} book
                        {totalBooks === 1 ? "" : "s"}
                    </p>

                    <div className="book-grid">
                        {books.map((book) => (
                            <BookCard key={book._id} book={book} />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                ← Previous
                            </button>
                            <span className="pagination__status">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
