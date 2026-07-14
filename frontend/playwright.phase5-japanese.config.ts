import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "phase5-japanese-drawing-remediation.spec.ts",
  fullyParallel: false,
  timeout: 180000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "npx concurrently -k \"cd .. && .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000\" \"VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL=true npm run dev -- --host 127.0.0.1 --port 4173\"",
    cwd: "/home/masaharu/Projects/spacer-clone/frontend",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
