import { defineConfig, devices } from "@playwright/test";

// With BASE_URL set (the Compose stack, Kubernetes), test that address and start nothing. Without it, start the dev
// servers here (Redis comes from Docker), reusing any that are already running except in CI.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
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
          command: "uv run uvicorn app.main:app --port 8000",
          cwd: "../backend",
          url: "http://localhost:8000/api/v1/livez",
          reuseExistingServer: !isCI,
        },
        {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !isCI,
        },
      ],
});
