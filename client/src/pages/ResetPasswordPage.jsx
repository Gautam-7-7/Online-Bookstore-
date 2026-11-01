import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/account.js";

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const token = searchParams.get("token") || "";

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await resetPassword(token, password);
            navigate("/login", {
                replace: true,
                state: { message: "Password reset successfully. Log in with your new password." }
            });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="form-page">
            <h1>Choose a new password</h1>
            {!token && <p className="form-page__error" role="alert">This reset link is missing its token.</p>}
            {error && <p className="form-page__error" role="alert">{error}</p>}
            <form className="form-card" onSubmit={handleSubmit}>
                <label className="field">
                    <span>New password</span>
                    <input
                        type="password"
                        autoComplete="new-password"
                        minLength="10"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                <p className="form-page__hint">
                    Use at least 10 characters, including uppercase, lowercase, a number, and a symbol.
                </p>
                <button className="search-bar__button" disabled={submitting || !token}>
                    {submitting ? "Updating…" : "Update password"}
                </button>
            </form>
            <p className="form-page__switch"><Link to="/login">Back to login</Link></p>
        </section>
    );
}
