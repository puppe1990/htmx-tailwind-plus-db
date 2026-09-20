import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Dedicated DB and port so the e2e run never touches a dev server or its data.
const E2E_DB = `file:${fileURLToPath(new URL("./src/data/e2e.db", import.meta.url))}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4174",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: "4174", DATABASE_URL: E2E_DB },
  },
});
