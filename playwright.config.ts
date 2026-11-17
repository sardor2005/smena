import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  use: {
    baseURL: "http://localhost:3100",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `SMENA_E2E=1 DATA_DIR=.data/e2e-${process.pid} npm run dev -- --port 3100`,
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60000,
  },
  reporter: "list",
});
