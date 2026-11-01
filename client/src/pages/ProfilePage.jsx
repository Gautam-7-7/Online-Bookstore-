import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProfile, updateProfile } from "../api/account.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function ProfilePage() {
    const { token, user, updateUser } = useAuth();
    const [values, setValues] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: ""
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let ignore = false;
        getProfile(token)
            .then(({ user: profile }) => {
                if (!ignore) {
                    setValues({
                        name: profile.name,
                        email: profile.email,
                        phone: profile.phone || ""
                    });
                }
            })
            .catch((requestError) => {
                if (!ignore) {
                    setError(requestError.message);
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });
        return () => {
            ignore = true;
        };
    }, [token]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        setMessage("");
        try {
            const result = await updateProfile(values, token);
            updateUser(result.user);
            setMessage("Profile saved.");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="state state--loading">Loading profile…</p>;
    }

    return (
        <section className="form-page">
            <h1>Your profile</h1>
            {error && <p className="form-page__error" role="alert">{error}</p>}
            {message && <p className="form-page__notice" role="status">{message}</p>}
            <form className="form-card" onSubmit={handleSubmit}>
                <label className="field">
                    <span>Name</span>
                    <input
                        required
                        maxLength="100"
                        value={values.name}
                        onChange={(event) =>
                            setValues((current) => ({ ...current, name: event.target.value }))
                        }
                    />
                </label>
                <label className="field">
                    <span>Email</span>
                    <input
                        type="email"
                        required
                        value={values.email}
                        onChange={(event) =>
                            setValues((current) => ({ ...current, email: event.target.value }))
                        }
                    />
                </label>
                <label className="field">
                    <span>Phone</span>
                    <input
                        type="tel"
                        maxLength="30"
                        value={values.phone}
                        onChange={(event) =>
                            setValues((current) => ({ ...current, phone: event.target.value }))
                        }
                    />
                </label>
                <button className="search-bar__button" disabled={submitting}>
                    {submitting ? "Saving…" : "Save profile"}
                </button>
            </form>
            <p className="form-page__switch">
                Manage your saved delivery addresses in <Link to="/checkout">checkout</Link>.
            </p>
        </section>
    );
}
