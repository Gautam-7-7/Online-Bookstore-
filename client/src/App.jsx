import { Routes, Route, Link } from "react-router-dom";
import CataloguePage from "./pages/CataloguePage.jsx";
import BookDetailsPage from "./pages/BookDetailsPage.jsx";

// App shell: a simple header with navigation, then the routed pages.
//   /            -> catalogue (listing, search, filter, sort)
//   /books/:id   -> single book detail page
export default function App() {
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
                    </nav>
                </div>
            </header>

            <main className="site-main">
                <Routes>
                    <Route path="/" element={<CataloguePage />} />
                    <Route path="/books/:id" element={<BookDetailsPage />} />
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
