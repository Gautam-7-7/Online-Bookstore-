import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, saveToken } from "../api/auth.js";

export default function RegisterPage({ onRegister }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedName = form.name.trim();
        if (!trimmedName || !form.email || !form.password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await registerUser({
                name: trimmedName,
                email: form.email,
                password: form.password
            });

            if (result?.token) {
                saveToken(result.token);
                onRegister(result.token);
            }

            navigate("/");
        } catch (err) {
            setError(err.message || "Unable to create your account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>Create an account</h1>
                <p className="auth-card__subtitle">
                    Passwords must include uppercase, lowercase, numbers, and symbols.
                </p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label className="field">
                        <span className="field__label">Full name</span>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Jane Doe"
                        />
                    </label>

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
                            placeholder="Create a strong password"
                        />
                    </label>

                    <label className="field">
                        <span className="field__label">Confirm password</span>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            placeholder="Re-enter your password"
                        />
                    </label>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="auth-link-row">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}
