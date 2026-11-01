import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/account.js";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setSubmitting(true);
        try {
            const result = await requestPasswordReset(email);
            setMessage(result.message);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="form-page">
            <h1>Reset your password</h1>
            <p className="form-page__hint">
                Enter your account email. If eligible, we’ll email a single-use link that expires in 30 minutes.
            </p>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            {message && <p className="form-page__notice" role="status">{message}</p>}
            <form className="form-card" onSubmit={handleSubmit}>
                <label className="field">
                    <span>Email</span>
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </label>
                <button className="search-bar__button" disabled={submitting}>
                    {submitting ? "Sending…" : "Send reset link"}
                </button>
            </form>
            <p className="form-page__switch"><Link to="/login">Back to login</Link></p>
        </section>
    );
}
