import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, saveToken } from "../api/auth.js";

export default function LoginPage({ onLogin }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.email || !form.password) {
            setError("Please enter both email and password.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await loginUser(form);
            saveToken(data.token);
            onLogin(data.token);
            navigate("/");
        } catch (err) {
            setError(err.message || "Unable to log in right now.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Welcome back</h1>
                <p className="auth-card__subtitle">Sign in to continue shopping.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label className="field">
                        <span className="field__label">Email</span>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="field">
                        <span className="field__label">Password</span>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Your password"
                        />
                    </label>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? "Signing in..." : "Log in"}
                    </button>
                </form>

                <p className="auth-link-row">
                    Need an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}
