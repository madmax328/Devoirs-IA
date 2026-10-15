import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    locale: "fr-FR",
    // Navigateur local fourni (sinon : pnpm exec playwright install chromium).
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `pnpm exec next start -p ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { BETTER_AUTH_URL: `http://localhost:${port}` },
  },
});
