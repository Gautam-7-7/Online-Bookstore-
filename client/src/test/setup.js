import "@testing-library/jest-dom/vitest";

if (typeof globalThis.localStorage === "undefined") {
    const values = new Map();
    globalThis.localStorage = {
        clear: () => values.clear(),
        getItem: (key) => values.get(String(key)) ?? null,
        key: (index) => Array.from(values.keys())[index] ?? null,
        removeItem: (key) => values.delete(String(key)),
        setItem: (key, value) => values.set(String(key), String(value)),
        get length() {
            return values.size;
        }
    };
}
