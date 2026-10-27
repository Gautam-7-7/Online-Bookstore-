import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/auth.js";

const STORAGE_KEY = "bookstore-auth";

export default function LoginPage() {
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
        setLoading(true);
        setError("");

        try {
            const data = await loginUser(form);
            const session = {
                token: data.token,
                user: data.user
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            navigate("/");
            window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page">
            <div className="auth-card">
                <h1>Login</h1>
                <p className="auth-card__subtitle">
                    Access your account to continue browsing and selling books.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-form__field">
                        <span>Email</span>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="auth-form__field">
                        <span>Password</span>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    {error && <p className="form-error">{error}</p>}

                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="auth-card__footer">
                    Need an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </section>
    );
}
