import { defineConfig } from "@playwright/test";
import path from "node:path";

/**
 * SPACER CLONE Playwright E2E gate.
 *
 * E2E 専用 port を使い、通常の開発サーバー (backend:8000 / frontend:5173) から
 * 分離する。port 8000 が AI-RIM 等の別プロセスで使用中でも、この Gate は
 * 独立して起動・実行・停止できる。
 *
 * 既定の E2E 専用 port:
 *   - backend:  18000  (SPACER_E2E_BACKEND_PORT で変更可)
 *   - frontend: 15173  (SPACER_E2E_FRONTEND_PORT で変更可)
 *
 * backend は `SPACER_BACKEND_DATA_DIR` でデータ置き場を分離する。
 * frontend (Vite) は `SPACER_BACKEND_ORIGIN` で proxy 先を E2E backend へ向ける。
 */

const backendPort = Number(process.env.SPACER_E2E_BACKEND_PORT ?? 18000);
const frontendPort = Number(process.env.SPACER_E2E_FRONTEND_PORT ?? 15173);
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
// E2E 専用 backend データ置き場 (frontend/test-results/ 配下: gitignore 済み)
const e2eDataDir = path.resolve(__dirname, "test-results", "e2e-backend-data");
// webServer の stdout/stderr をファイルへ向け、呼び出し側 (npm script / agent) の
// pipe を子プロセスが保持して終了しない問題を避ける。
const logDir = path.resolve(__dirname, "test-results", "e2e-server-logs");
const backendLog = path.join(logDir, "backend.log");
const frontendLog = path.join(logDir, "frontend.log");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
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
      stdout: backendLog,
      stderr: backendLog,
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
      stdout: frontendLog,
      stderr: frontendLog,
    },
  ],
});
