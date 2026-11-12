import { defineConfig, devices } from "@playwright/test";

// With BASE_URL set (the Compose stack, Kubernetes), test that address and start nothing. Without it, start fresh
// servers from the current code (Redis comes from Docker) on their own ports, API 8001 and Vite 3001, so a run never
// tests, or disturbs, dev servers on 8000/3000 that may be running older code.
const API_PORT = 8001;
const WEB_PORT = 3001;
const baseURL = process.env.BASE_URL ?? `http://localhost:${WEB_PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  retries: isCI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : [
        {
          command: `uv run uvicorn app.main:app --port ${API_PORT}`,
          cwd: "../backend",
          url: `http://localhost:${API_PORT}/api/v1/livez`,
          reuseExistingServer: false,
        },
        {
          command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
          env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
          url: `http://localhost:${WEB_PORT}`,
          reuseExistingServer: false,
        },
      ],
});
