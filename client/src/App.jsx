import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import CataloguePage from "./pages/CataloguePage.jsx";
import BookDetailsPage from "./pages/BookDetailsPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import CreateBookPage from "./pages/CreateBookPage.jsx";
import EditListingPage from "./pages/EditListingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SellerDashboardPage from "./pages/SellerDashboardPage.jsx";

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
                                <Link to="/seller/dashboard" className="site-header__link">
                                    Seller dashboard
                                </Link>
                                <Link to="/cart" className="site-header__link">
                                    Cart
                                </Link>
                                <Link to="/orders" className="site-header__link">
                                    Orders
                                </Link>
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
                        path="/seller/dashboard"
                        element={
                            <RequireAuth>
                                <SellerDashboardPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/sell/:id/edit"
                        element={
                            <RequireAuth>
                                <EditListingPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/cart"
                        element={
                            <RequireAuth>
                                <CartPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/checkout"
                        element={
                            <RequireAuth>
                                <CheckoutPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <RequireAuth>
                                <OrdersPage />
                            </RequireAuth>
                        }
                    />
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
