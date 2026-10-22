import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development the frontend runs on http://localhost:5173 and the
// backend on http://localhost:5000. This proxy forwards any request that
// starts with /api to the backend, so the browser never hits a CORS wall
// and the frontend code can just call "/api/books".
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true
            }
        }
    }
});
