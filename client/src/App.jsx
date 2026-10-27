import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { clearToken, getCurrentUser, getStoredToken } from "./api/auth.js";
import CataloguePage from "./pages/CataloguePage.jsx";
import BookDetailsPage from "./pages/BookDetailsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

export default function App() {
    const [token, setToken] = useState(() => getStoredToken());
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            if (!token) {
                setUser(null);
                return;
            }

            try {
                const data = await getCurrentUser(token);
                setUser(data.user);
            } catch (error) {
                clearToken();
                setToken(null);
                setUser(null);
            }
        };

        loadUser();
    }, [token]);

    const handleLogout = () => {
        clearToken();
        setToken(null);
        setUser(null);
    };

    return (
        <div className="app">
            <header className="site-header">
                <div className="site-header__inner">
                    <Link to="/" className="site-header__brand">
                        📚 Online Bookstore
                    </Link>
                    <nav className="site-header__nav" aria-label="Main navigation">
                        <Link to="/" className="site-header__link">
                            Catalogue
                        </Link>
                        {!user ? (
                            <>
                                <Link to="/login" className="site-header__link">
                                    Login
                                </Link>
                                <Link to="/register" className="site-header__link">
                                    Register
                                </Link>
                            </>
                        ) : (
                            <>
                                <span className="site-header__user">
                                    Hi, {user.name?.split(" ")[0] || "Reader"}
                                </span>
                                <button
                                    type="button"
                                    className="site-header__logout"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="site-main">
                <Routes>
                    <Route path="/" element={<CataloguePage />} />
                    <Route path="/login" element={<LoginPage onLogin={setToken} />} />
                    <Route
                        path="/register"
                        element={<RegisterPage onRegister={setToken} />}
                    />
                    <Route path="/books/:id" element={<BookDetailsPage />} />
                    <Route
                        path="*"
                        element={
                            <p className="state state--empty">
                                Page not found. <Link to="/">Back to catalogue</Link>
                            </p>
                        }
                    />
                </Routes>
            </main>

            <footer className="site-footer">
                Online Bookstore — SE Mini Project, Team 12
            </footer>
        </div>
    );
}
