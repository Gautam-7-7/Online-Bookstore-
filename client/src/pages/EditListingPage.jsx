import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BookListingForm from "../components/BookListingForm.jsx";
import { getSellerListing, updateSellerListing } from "../api/commerce.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function EditListingPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;
        getSellerListing(id, token)
            .then(({ book: listing }) => {
                if (!ignore) {
                    setBook(listing);
                }
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(requestError.message);
                }
            });
        return () => {
            ignore = true;
        };
    }, [id, token]);

    const handleSubmit = async (values) => {
        await updateSellerListing(id, values, token);
        navigate("/seller/dashboard", { replace: true });
    };

    if (error) {
        return <p className="state state--error" role="alert">{error}</p>;
    }
    if (!book) {
        return <p className="state state--loading">Loading listing…</p>;
    }

    return (
        <section className="form-page form-page--wide">
            <Link to="/seller/dashboard" className="book-details__back">
                ← Back to seller dashboard
            </Link>
            <h1>Edit listing</h1>
            <BookListingForm
                initialValues={book}
                submitLabel="Save changes"
                submittingLabel="Saving changes…"
                onSubmit={handleSubmit}
            />
        </section>
    );
}
