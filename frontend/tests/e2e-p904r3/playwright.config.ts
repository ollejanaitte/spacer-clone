import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node -e \"setTimeout(()=>{}, 99999999)\"",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 5000,
  },
});
