import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    // Same origin as the API in dev, so the browser needs no CORS setup (docs/decisions/0004). The E2E run points it
    // at its own API (playwright.config.ts).
    proxy: { "/api": process.env.API_PROXY_TARGET ?? "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
