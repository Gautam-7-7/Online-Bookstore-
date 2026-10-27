import { createContext, useContext, useMemo, useState } from "react";
import { login as loginRequest } from "../api/auth.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "online-bookstore-auth";

const readStoredAuth = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const auth = stored ? JSON.parse(stored) : null;
        return auth?.token && auth?.user ? auth : null;
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(readStoredAuth);

    const value = useMemo(
        () => ({
            user: auth?.user || null,
            token: auth?.token || null,
            signIn: async (credentials) => {
                const result = await loginRequest(credentials);
                const nextAuth = { token: result.token, user: result.user };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
                setAuth(nextAuth);
                return result;
            },
            signOut: () => {
                localStorage.removeItem(STORAGE_KEY);
                setAuth(null);
            }
        }),
        [auth]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
