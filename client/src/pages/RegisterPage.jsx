import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth.js";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await register({ name, email, password });
            navigate("/login", {
                replace: true,
                state: { message: "Account created. Log in to continue." }
            });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="form-page">
            <h1>Create an account</h1>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            <form className="form-card" onSubmit={handleSubmit}>
                <label className="field">
                    <span>Name</span>
                    <input
                        type="text"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </label>
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
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </label>
                <button className="search-bar__button" disabled={submitting}>
                    {submitting ? "Creating account…" : "Register"}
                </button>
            </form>
            <p className="form-page__switch">
                Already registered? <Link to="/login">Log in</Link>
            </p>
        </section>
    );
}
