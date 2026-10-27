import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import CataloguePage from "./pages/CataloguePage.jsx";
import BookDetailsPage from "./pages/BookDetailsPage.jsx";
import CreateBookPage from "./pages/CreateBookPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

function RequireAuth({ children }) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}

function AppContent() {
    const { user, signOut } = useAuth();

    return (
        <div className="app">
            <header className="site-header">
                <div className="site-header__inner">
                    <Link to="/" className="site-header__brand">
                        📚 Online Bookstore
                    </Link>
                    <nav>
                        <Link to="/" className="site-header__link">
                            Catalogue
                        </Link>
                        {user ? (
                            <>
                                <Link to="/sell" className="site-header__link">
                                    List a book
                                </Link>
                                <span className="site-header__user">{user.name}</span>
                                <button className="site-header__button" onClick={signOut}>
                                    Log out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="site-header__link">
                                    Log in
                                </Link>
                                <Link to="/register" className="site-header__link">
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="site-main">
                <Routes>
                    <Route path="/" element={<CataloguePage />} />
                    <Route path="/books/:id" element={<BookDetailsPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/sell"
                        element={
                            <RequireAuth>
                                <CreateBookPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <p className="state state--empty">
                                Page not found.{" "}
                                <Link to="/">Back to catalogue</Link>
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

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
