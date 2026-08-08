import { expect, test } from "@playwright/test";

// Phase C1 (A-07) 異常系 E2E — Fail-Closed 検証
// A. 不完全 Pier model → Adapter ERROR（Engine を不正実行しない）
// B. Engine unavailable → 明確な ERROR・クラッシュなし
// C. malformed result → reject / ERROR
// D. supportId mismatch → result 適用拒否
// E. schemaVersion mismatch → fail-closed
// F. saved result missing → Pier のみ Load・Result 未利用
// G. stale result → 警告

const PIER = {
  supportId: "P1",
  supportType: "pier",
  skewRad: 0,
  placement: { source: "liner", alignmentId: "aln", station: 0, offset: 0 },
  bearingSeats: [],
  pier: {
    id: "P1",
    formType: "single_column_rect",
    column: { id: "P1-COLUMN", width: 1.2, depth: 1.6, height: 7 },
    cap: { id: "P1-CAP", width: 1.6, depth: 8, height: 1.2, overhangL: 0, overhangR: 0 },
    footing: { id: "P1-FOOTING", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
  },
};

const ADAPTER_INPUT = {
  schemaVersion: "0.1.0",
  supportId: "P1",
  structureType: "pier",
  geometry: {
    pierFormType: "single_column_rect",
    column: { width: 1.2, depth: 1.6, height: 7 },
    footing: { length: 6, width: 8, thickness: 1.8 },
  },
  placement: { station: 0, offset: 0, skewDeg: 0, zOverride: null },
  modelRevision: "rev-00000000",
  units: { length: "m", force: "kN", angle: "deg" },
  bearingSeatCount: 0,
  reactionCaseKinds: [],
};

const ADAPTER_RESULT = {
  schemaVersion: "0.1.0",
  calculationId: "calc-test-001",
  supportId: "P1",
  engineType: "test-mock",
  engineVersion: "0.1.0",
  status: "TEST_PASS",
  checks: [],
  summary: { pass: 1, fail: 0, hold: 0, total: 1 },
  errors: [],
  warnings: [],
  trace: [],
  generatedAt: "2026-08-08T00:00:00.000Z",
  isFormalDesign: false,
  engineLabel: "TEST",
};

function envelope(calculation: unknown) {
  return {
    schemaVersion: "0.1.0",
    project: {
      schemaVersion: "0.2.0",
      projectId: "f",
      source: "c1",
      coordinateSystem: "x-longitudinal-y-transverse-z-up",
      unitSystem: "si",
      alignmentRefs: [],
      supports: [PIER],
      metadata: { sourceApplication: "x", sourceVersion: "1", sourceRevision: "1", createdAt: "", updatedAt: "" },
    },
    ...(calculation !== undefined ? { calculation } : {}),
  };
}

async function loadBuffer(page: import("@playwright/test").Page, data: unknown) {
  await page.locator("[data-testid=substructure-load-input]").setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
}

test.describe("Phase C1 A-07 adapter fail-closed", () => {
  test("A: incomplete pier model -> Adapter ERROR (engine not run)", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-pier_single]").click();
    await page.locator("[data-testid=tree-item-S1]").click();
    // 柱幅 0 → incomplete model
    await page.locator("[data-testid=pier-col-width] input").fill("0");
    await page.waitForTimeout(400);
    await page.locator("[data-testid=run-adapter-test]").click();
    await expect(page.locator("[data-testid=adapter-result-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=adapter-errors]")).toBeVisible();
    await expect(page.locator("[data-testid=adapter-errors]")).toContainText("Adapter 入力生成に失敗");
    // Engine は実行されていない（checks 空・ERROR）
    await expect(page.locator("[data-testid=adapter-status-badge]")).toHaveText("ERROR");
  });

  test("B: engine unavailable -> clear ERROR, no crash", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-pier_single]").click();
    await page.locator("[data-testid=engine-unavailable-toggle] input").check();
    await page.locator("[data-testid=run-adapter-test]").click();
    await expect(page.locator("[data-testid=adapter-result-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=adapter-errors]")).toContainText("利用できません");
    await expect(page.locator("[data-testid=adapter-status-badge]")).toHaveText("ERROR");
    // クラッシュなし
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
  });

  test("C: malformed result -> rejected on load (fail-closed)", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    const calc = {
      inputs: { P1: ADAPTER_INPUT },
      results: { P1: { ...ADAPTER_RESULT, status: "ok" } },
      engineType: "test-mock",
      engineVersion: "0.1.0",
    };
    await loadBuffer(page, envelope(calc));
    await expect(page.locator("[data-testid=substructure-persist-message]")).toContainText("読込失敗");
    // 結果が正式表示されない
    await expect(page.locator("[data-testid=adapter-result-panel]")).toHaveCount(0);
  });

  test("D: supportId mismatch -> result application rejected", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    const calc = {
      inputs: { P1: ADAPTER_INPUT },
      results: { P1: { ...ADAPTER_RESULT, supportId: "OTHER" } },
      engineType: "test-mock",
      engineVersion: "0.1.0",
    };
    await loadBuffer(page, envelope(calc));
    await expect(page.locator("[data-testid=substructure-persist-message]")).toContainText("読込失敗");
    await expect(page.locator("[data-testid=adapter-result-panel]")).toHaveCount(0);
  });

  test("E: schemaVersion mismatch -> fail-closed", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    const bad = envelope(undefined);
    bad.project.schemaVersion = "9.9.9";
    await loadBuffer(page, bad);
    await expect(page.locator("[data-testid=substructure-persist-message]")).toContainText("読込失敗");
    await expect(page.locator("[data-testid=tree-item-P1]")).toHaveCount(0);
  });

  test("F: saved result missing -> pier model loads, result unused", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    // legacy 素の project（calculation なし）
    await loadBuffer(page, envelope(undefined));
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();
    await expect(page.locator("[data-testid=adapter-result-panel]")).toHaveCount(0);
  });

  test("G: stale result -> warning (model revision mismatch)", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    // modelRevision が現モデルと不一致（rev-00000000 は正しい値でない）
    const calc = {
      inputs: { P1: ADAPTER_INPUT },
      results: { P1: ADAPTER_RESULT },
      engineType: "test-mock",
      engineVersion: "0.1.0",
    };
    await loadBuffer(page, envelope(calc));
    await expect(page.locator("[data-testid=substructure-persist-message]")).toContainText("stale");
  });
});
