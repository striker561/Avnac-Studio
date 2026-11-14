import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

/**
 * Vector-board end-to-end suite.
 *
 * These tests drive the real desktop app through the Wails browser server so
 * native storage and the Go bridge are exercised, not mocked:
 *
 *   wails dev -browser        # serves http://localhost:34115
 *   npm run test:e2e
 *
 * Point AVNAC_E2E_URL at another Wails dev URL when needed. The suite runs
 * serially because a Wails dev session broadcasts actions to every connected
 * frontend.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  // Wails watches the project tree; keep traces/screenshots out of it so
  // writing an artifact cannot trigger a frontend reload mid-test.
  outputDir: path.join(os.tmpdir(), "avnac-vector-e2e"),
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.AVNAC_E2E_URL ?? "http://localhost:34115",
    viewport: { width: 1500, height: 1000 },
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1500, height: 1000 } },
    },
  ],
});
