import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "npx concurrently -k \"cd .. && .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000\" \"npm run dev -- --host 127.0.0.1 --port 4173\"",
    env: {
      VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL: "true",
    },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
