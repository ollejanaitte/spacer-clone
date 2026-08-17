import { defineConfig } from "@playwright/test";
import path from "node:path";
import type { Config } from "@playwright/test";

/**
 * F-4: E2E tier factory (smoke / critical / full)。
 *
 * 各 tier は専用 Playwright config を持ち、指定 spec のみを実行する。
 * 同一の E2E 専用 port / data dir / server lifecycle を共有する
 * (playwright.config.ts の既定 env を再利用)。
 *
 * tier 定義:
 * - smoke:    数分以内の起動 / 基本導線検査。頻繁実行可能。
 * - critical: 主要業務機能の回帰検査。PR / milestone で実行。
 * - full:     高コストな業務 Acceptance (Reference Business 001 等)。
 *             毎 commit では回さない。
 */

export const BACKEND_PORT = Number(process.env.SPACER_E2E_BACKEND_PORT ?? 18000);
export const FRONTEND_PORT = Number(process.env.SPACER_E2E_FRONTEND_PORT ?? 15173);
const BACKEND_ORIGIN = `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_ORIGIN = `http://127.0.0.1:${FRONTEND_PORT}`;
const E2E_DATA_DIR = path.resolve(__dirname, "test-results", "e2e-backend-data");
const LOG_DIR = path.resolve(__dirname, "test-results", "e2e-server-logs");
const BACKEND_LOG = path.join(LOG_DIR, "backend.log");
const FRONTEND_LOG = path.join(LOG_DIR, "frontend.log");

export const SMOKE_SPECS = [
  "level0-navigation.spec.ts",
  "design-platform-business-flow.spec.ts",
  "design-platform-electron-startup.spec.ts",
  "fixture-standardization.spec.ts",
  "adapter-normal-path.spec.ts",
  "adapter-failure-path.spec.ts",
];

export const CRITICAL_SPECS = [
  // Save/Load/Migration (green at baseline)
  "substructure-persistence.spec.ts",
  // Terrain reopen
  "mountain-sample-workflow.spec.ts",
  // Road / Bridge workflow
  "mountain-3d-viewer.spec.ts",
  "substructure-main-entry.spec.ts",
  "substructure-integration.spec.ts",
  "substructure-m3-integration.spec.ts",
  "substructure-superstructure-integration.spec.ts",
  // Unified Viewer
  "camera-presets.spec.ts",
  "mountain-main3d.spec.ts",
  // Analysis critical path
  "th-analysis-revamp.spec.ts",
  "step3-superstructure-pipeline.spec.ts",
  // Migration
  "p4-d05-review-diagrams.spec.ts",
  "p4-d06-reports-csv.spec.ts",
  "s3-ux10-schematic.spec.ts",
];

export const FULL_SPECS = [
  // Reference Business / expensive acceptance
  "reference-business-001-full.spec.ts",
  "apollo-step4a-workflow.spec.ts",
  "apollo-step4b-appurtenance-haunch.spec.ts",
  "apollo-step4c-integration.spec.ts",
  "apollo-step5-final-gui.spec.ts",
  "apollo-step5-jp3c-full-gui-e2e.spec.ts",
  "apollo-step5r-residual.spec.ts",
  "bridgeDefinition.spec.ts",
  "phase4-user-acceptance.spec.ts",
  "phase5-japanese-drawing-remediation.spec.ts",
  "phase5-step3-dxf-export.spec.ts",
  "p2-d06-viewer-vertical-z.spec.ts",
  "p3-d07-print-dxf-parity.spec.ts",
  "substructure-design-result.spec.ts",
  // NOTE: 以下の legacy LINER save/load 系は Wave 3 baseline (19dfdfb) 時点で
  // 既に失敗する pre-existing の stale spec (saveボタン導線変更後未同期)。
  // Lane F 起因ではない。full tier に置き、KNOWN_BROKEN_PREEXISTING として
  // docs/development/e2e-tiering.md へ記録する。
  "p1-d05-liner-ui-save-load.spec.ts",
  "p3-f03-rdd-bridge-drawing-persistence.spec.ts",
  "p4-d01-multi-alignment.spec.ts",
  "p4-d02-ldist.spec.ts",
  "p4-d03-haunch.spec.ts",
  "p4-d04-hoso.spec.ts",
  "p4-d08-roundtrip.spec.ts",
];

/** smoke / critical / full の重複検査: 各 spec は1つの tier にのみ属する。 */
export function validateTierDisjoint() {
  const all = [...SMOKE_SPECS, ...CRITICAL_SPECS, ...FULL_SPECS];
  const seen = new Map<string, string>();
  const dup: string[] = [];
  for (const name of all) {
    if (seen.has(name)) dup.push(name);
    seen.set(name, name);
  }
  if (dup.length > 0) {
    throw new Error(`E2E tier overlap: ${dup.join(", ")}`);
  }
  return all;
}

export function makeTierConfig(specs: readonly string[], options: { timeout?: number } = {}): Config {
  validateTierDisjoint();
  return defineConfig({
    testDir: "./tests/e2e",
    testMatch: specs,
    fullyParallel: false,
    workers: 1,
    timeout: options.timeout ?? 120000,
    use: {
      baseURL: FRONTEND_ORIGIN,
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
    },
    webServer: [
      {
        command: `mkdir -p "${LOG_DIR}" && cd .. && exec .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port ${BACKEND_PORT} > "${BACKEND_LOG}" 2>&1`,
        env: {
          SPACER_BACKEND_DATA_DIR: E2E_DATA_DIR,
        },
        url: `${BACKEND_ORIGIN}/health`,
        reuseExistingServer: false,
        timeout: 120000,
        stdout: "ignore",
        stderr: "ignore",
      },
      {
        command: `mkdir -p "${LOG_DIR}" && exec ./node_modules/.bin/vite --mode apollo --host 127.0.0.1 --port ${FRONTEND_PORT} > "${FRONTEND_LOG}" 2>&1`,
        env: {
          SPACER_BACKEND_ORIGIN: BACKEND_ORIGIN,
          VITE_USE_BRIDGE_DEFINITION_STRUCTURAL_MODEL: "true",
        },
        url: FRONTEND_ORIGIN,
        reuseExistingServer: false,
        timeout: 120000,
        stdout: "ignore",
        stderr: "ignore",
      },
    ],
  });
}
