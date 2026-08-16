import { defineConfig } from "@playwright/test";
import path from "node:path";

const backendPort = Number(process.env.SPACER_E2E_BACKEND_PORT ?? 18000);
const frontendPort = Number(process.env.SPACER_E2E_FRONTEND_PORT ?? 15173);
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
const e2eDataDir = path.resolve(__dirname, "test-results", "e2e-backend-data");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "phase5-japanese-drawing-remediation.spec.ts",
  fullyParallel: false,
  timeout: 180000,
  use: {
    baseURL: frontendOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `cd .. && .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port ${backendPort}`,
      env: {
        SPACER_BACKEND_DATA_DIR: e2eDataDir,
      },
      url: `${backendOrigin}/health`,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: `npm run dev -- --mode apollo --host 127.0.0.1 --port ${frontendPort}`,
      env: {
        SPACER_BACKEND_ORIGIN: backendOrigin,
        VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL: "true",
      },
      url: frontendOrigin,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
