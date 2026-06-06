import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces so Docker's port mapping reaches the dev server.
    host: "0.0.0.0",
    port: 5173,
    // Proxy API calls to the api container so the browser makes same-origin
    // requests (no CORS). "api" is the docker-compose service name.
    proxy: {
      "/api": {
        target: "http://api:3000",
        changeOrigin: true,
      },
    },
  },
});
