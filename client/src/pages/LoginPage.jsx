import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
    const { signIn } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await signIn({ email, password });
            navigate(location.state?.from || "/", { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="form-page">
            <h1>Log in</h1>
            {location.state?.message && (
                <p className="form-page__notice" role="status">
                    {location.state.message}
                </p>
            )}
            {error && <p className="form-page__error" role="alert">{error}</p>}
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
                <label className="field">
                    <span>Password</span>
                    <input
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                <button className="search-bar__button" disabled={submitting}>
                    {submitting ? "Logging in…" : "Log in"}
                </button>
            </form>
            <p className="form-page__switch">
                New here? <Link to="/register">Create an account</Link>
            </p>
        </section>
    );
}
