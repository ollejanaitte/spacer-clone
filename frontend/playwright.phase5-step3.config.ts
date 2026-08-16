import { defineConfig } from "@playwright/test";

const frontendPort = Number(process.env.SPACER_E2E_FRONTEND_PORT ?? 15173);
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "phase5-step3-dxf-export.spec.ts",
  fullyParallel: false,
  timeout: 120000,
  use: {
    baseURL: frontendOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
