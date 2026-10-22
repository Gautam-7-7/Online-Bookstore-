import { useState } from "react";

// Controlled search input. It keeps its own text locally and only tells the
// parent to search when the form is submitted (Enter or the button), so we
// do not fire a request on every keystroke.
export default function SearchBar({ initialValue = "", onSearch }) {
    const [value, setValue] = useState(initialValue);

    const handleSubmit = (event) => {
        event.preventDefault();
        onSearch(value.trim());
    };

    const handleClear = () => {
        setValue("");
        onSearch("");
    };

    return (
        <form className="search-bar" onSubmit={handleSubmit} role="search">
            <input
                type="text"
                className="search-bar__input"
                placeholder="Search by title, author or ISBN…"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-label="Search books"
            />
            {value && (
                <button
                    type="button"
                    className="search-bar__clear"
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    ×
                </button>
            )}
            <button type="submit" className="search-bar__button">
                Search
            </button>
        </form>
    );
}
