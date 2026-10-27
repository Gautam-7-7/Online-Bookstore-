import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createBookListing } from "../api/auth.js";

const defaultForm = {
    title: "",
    author: "",
    isbn: "",
    category: "",
    price: "",
    condition: "Good",
    seller: "",
    stock: "1",
    description: "",
    coverImage: ""
};

export default function SellBookPage({ currentUser }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        ...defaultForm,
        seller: currentUser?.user?.name || ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                ...form,
                price: Number(form.price),
                stock: Number(form.stock || 0),
                seller: form.seller || currentUser?.user?.name || "Unknown Seller"
            };

            const data = await createBookListing(payload, currentUser?.token);
            setSuccess(`Book listed successfully: ${data.book?.title || "Your book"}`);
            setForm({ ...defaultForm, seller: currentUser?.user?.name || "" });
            setTimeout(() => navigate(`/books/${data.book?._id}`), 600);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser?.token) {
        return (
            <section className="auth-page">
                <div className="auth-card auth-card--compact">
                    <h1>Sell a Book</h1>
                    <p className="auth-card__subtitle">
                        Please log in before creating a listing.
                    </p>
                    <div className="form-actions">
                        <Link to="/login" className="btn btn--primary">
                            Login
                        </Link>
                        <Link to="/register" className="btn btn--secondary">
                            Register
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="page-shell">
            <div className="page-header">
                <h1>List a new book</h1>
                <Link to="/" className="link-button">
                    ← Back to catalogue
                </Link>
            </div>

            <form className="book-form" onSubmit={handleSubmit}>
                <div className="book-form__grid">
                    <label className="auth-form__field">
                        <span>Title</span>
                        <input name="title" value={form.title} onChange={handleChange} required />
                    </label>

                    <label className="auth-form__field">
                        <span>Author</span>
                        <input name="author" value={form.author} onChange={handleChange} required />
                    </label>

                    <label className="auth-form__field">
                        <span>ISBN</span>
                        <input name="isbn" value={form.isbn} onChange={handleChange} required />
                    </label>

                    <label className="auth-form__field">
                        <span>Category</span>
                        <input name="category" value={form.category} onChange={handleChange} required />
                    </label>

                    <label className="auth-form__field">
                        <span>Price (₹)</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            name="price"
                            value={form.price}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="auth-form__field">
                        <span>Condition</span>
                        <select name="condition" value={form.condition} onChange={handleChange}>
                            <option value="New">New</option>
                            <option value="Like New">Like New</option>
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Poor">Poor</option>
                        </select>
                    </label>

                    <label className="auth-form__field">
                        <span>Seller</span>
                        <input name="seller" value={form.seller} onChange={handleChange} />
                    </label>

                    <label className="auth-form__field">
                        <span>Stock</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            name="stock"
                            value={form.stock}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="auth-form__field auth-form__field--full">
                        <span>Cover Image URL</span>
                        <input name="coverImage" value={form.coverImage} onChange={handleChange} />
                    </label>

                    <label className="auth-form__field auth-form__field--full">
                        <span>Description</span>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows="4"
                        />
                    </label>
                </div>

                {error && <p className="form-error">{error}</p>}
                {success && <p className="form-success">{success}</p>}

                <div className="form-actions">
                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? "Listing book..." : "Publish listing"}
                    </button>
                </div>
            </form>
        </section>
    );
}
