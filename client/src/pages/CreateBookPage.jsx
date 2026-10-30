import { Link, useNavigate } from "react-router-dom";
import { createBook } from "../api/books.js";
import { useAuth } from "../auth/AuthContext.jsx";
import BookListingForm from "../components/BookListingForm.jsx";

export default function CreateBookPage() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (values) => {
        const result = await createBook(values, token);
        navigate(`/books/${result.book._id}`, { replace: true });
    };

    return (
        <section className="form-page form-page--wide">
            <Link to="/" className="book-details__back">← Back to catalogue</Link>
            <h1>List a book</h1>
            <p className="form-page__hint">
                Your signed-in account name will be shown as the seller.
            </p>
            <BookListingForm
                submitLabel="Create listing"
                submittingLabel="Creating listing…"
                onSubmit={handleSubmit}
            />
        </section>
    );
}
