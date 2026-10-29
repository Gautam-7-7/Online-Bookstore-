import { useState } from "react";

const EMPTY_VALUES = {
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

export default function BookListingForm({
    initialValues = EMPTY_VALUES,
    submitLabel,
    submittingLabel,
    onSubmit
}) {
    const [values, setValues] = useState(() => ({
        ...Object.fromEntries(
            Object.keys(EMPTY_VALUES).map((field) => [
                field,
                initialValues[field] ?? EMPTY_VALUES[field]
            ])
        ),
        price: String(initialValues.price ?? ""),
        stock: String(initialValues.stock ?? 0)
    }));
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
            await onSubmit({
                ...values,
                price: Number(values.price),
                stock: Number(values.stock)
            });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
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
                    <input
                        name="coverImage"
                        type="url"
                        value={values.coverImage}
                        onChange={updateField}
                    />
                </label>
                <label className="field form-card__full">
                    <span>Description (optional)</span>
                    <textarea
                        name="description"
                        rows="4"
                        value={values.description}
                        onChange={updateField}
                    />
                </label>
                <button className="search-bar__button form-card__full" disabled={submitting}>
                    {submitting ? submittingLabel : submitLabel}
                </button>
            </form>
        </>
    );
}
