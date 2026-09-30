import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// Runs against the real banking service (NEXT_PUBLIC_API_BASE_URL in .env.local), so the specs only read.
export default defineConfig({
  testDir: "./e2e",
  // Uses the locally installed Chrome, so no separate browser download is needed.
  projects: [{ name: "chrome", use: { channel: "chrome" } }],
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
