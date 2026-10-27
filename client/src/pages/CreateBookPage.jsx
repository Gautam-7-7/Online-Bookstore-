import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createBook } from "../api/books.js";
import { useAuth } from "../auth/AuthContext.jsx";

const INITIAL_VALUES = {
    title: "",
    author: "",
    isbn: "",
    category: "",
    price: "",
    condition: "Good",
    coverImage: "",
    stock: "0",
    description: ""
};

export default function CreateBookPage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [values, setValues] = useState(INITIAL_VALUES);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const updateField = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const result = await createBook(
                {
                    ...values,
                    price: Number(values.price),
                    stock: Number(values.stock)
                },
                token
            );
            navigate(`/books/${result.book._id}`, { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="form-page form-page--wide">
            <Link to="/" className="book-details__back">← Back to catalogue</Link>
            <h1>List a book</h1>
            <p className="form-page__hint">
                Your signed-in account name will be shown as the seller.
            </p>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            <form className="form-card form-card--grid" onSubmit={handleSubmit}>
                <label className="field">
                    <span>Title</span>
                    <input name="title" required value={values.title} onChange={updateField} />
                </label>
                <label className="field">
                    <span>Author</span>
                    <input name="author" required value={values.author} onChange={updateField} />
                </label>
                <label className="field">
                    <span>ISBN</span>
                    <input name="isbn" required value={values.isbn} onChange={updateField} />
                </label>
                <label className="field">
                    <span>Category</span>
                    <input name="category" required value={values.category} onChange={updateField} />
                </label>
                <label className="field">
                    <span>Price</span>
                    <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={values.price}
                        onChange={updateField}
                    />
                </label>
                <label className="field">
                    <span>Condition</span>
                    <select name="condition" value={values.condition} onChange={updateField}>
                        {["New", "Like New", "Good", "Fair", "Poor"].map((condition) => (
                            <option key={condition} value={condition}>{condition}</option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span>Stock</span>
                    <input
                        name="stock"
                        type="number"
                        min="0"
                        step="1"
                        value={values.stock}
                        onChange={updateField}
                    />
                </label>
                <label className="field">
                    <span>Cover image URL (optional)</span>
                    <input name="coverImage" type="url" value={values.coverImage} onChange={updateField} />
                </label>
                <label className="field form-card__full">
                    <span>Description (optional)</span>
                    <textarea name="description" rows="4" value={values.description} onChange={updateField} />
                </label>
                <button className="search-bar__button form-card__full" disabled={submitting}>
                    {submitting ? "Creating listing…" : "Create listing"}
                </button>
            </form>
        </section>
    );
}
