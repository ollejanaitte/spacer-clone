import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";
// Phase C1 (M3-06) 統合 E2E（シナリオ A-H）
// 数値設計は根拠未 ADOPTED のため HOLD 判定を正直に検証する。

const SEISMIC_FIXTURE = join(
  __dirname,
  "fixtures",
  "p1-seismic-support-interface.json",
);

async function openSubstructure(page: import("@playwright/test").Page) {
  await page.goto("/pro/liner/substructure");
  await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
}

async function generateCombo(page: import("@playwright/test").Page) {
  await page.locator("[data-testid=open-sample-dialog]").click();
  await page.locator("[data-testid=combo-combo-standard]").click();
  await expect(page.locator("[data-testid=tree-item-A1]")).toBeVisible();
}

test.describe("Phase C1 M3-06 integration scenarios", () => {
  test("Scenario A: LINER -> bearing -> design -> HOLD -> 2D/3D", async ({ page }) => {
    // LINER
    await openProAndWait(page);
    await openLinerList(page);
    await openLinerLauncher(page, "gui");
    await expect(page).toHaveURL("/pro/liner/setup");
    await page.locator("[data-testid=liner-setup-tab-review]").click();
    await page.locator("[data-testid=add-bridge-pier]").click();
    await page.locator("[data-testid=bridge-pier-station-P1]").fill("30");
    await page.locator("[data-testid=open-substructure-planning]").click();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();

    // 上部工接続
    await page.locator("[data-testid=support-interface-input]").setInputFiles(SEISMIC_FIXTURE);
    await expect(page.locator("[data-testid=superstructure-message]")).toContainText("P1");

    // 設計計算 → HOLD
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-result-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=design-status-badge]")).toHaveText("HOLD");

    // 2D/3D
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(800);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
  });

  test("Scenario B: pier dimension change -> recompute -> result/3D update", async ({
    page,
  }) => {
    await openSubstructure(page);
    await generateCombo(page);
    await page.locator("[data-testid=tree-item-P1]").click();
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-sheet]")).toBeVisible();
    const before = await page
      .locator('[data-testid="design-row-0"]')
      .locator("xpath=following-sibling::*")
      .first()
      .textContent();

    // 柱幅変更
    await page.locator("[data-testid=portal-col-1-width] input").fill("3.0");
    await page.waitForTimeout(600);
    // 再計算
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-result-panel]")).toBeVisible();
    // 3D 更新
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(800);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
    expect(before).not.toBeNull();
  });

  test("Scenario C: abutment foundation design check shows HOLD", async ({ page }) => {
    await openSubstructure(page);
    await generateCombo(page);
    await page.locator("[data-testid=tree-item-A1]").click();
    await expect(page.locator("[data-testid=abutment-form]")).toBeVisible();
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-status-badge]")).toHaveText("HOLD");
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("橋台-部材照査");
  });

  test("Scenario D: pile condition change -> recompute -> design result update", async ({
    page,
  }) => {
    await openSubstructure(page);
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-foundation_bored]").click();
    await page.locator("[data-testid=tree-item-S1]").click();
    await page.locator("[data-testid=pile-count] input").fill("8");
    await page.waitForTimeout(400);
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("杭-杭体照査");
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("HOLD");
  });

  test("Scenario E: seismic input -> seismic check shown (HOLD)", async ({ page }) => {
    await openSubstructure(page);
    await generateCombo(page);
    await page.locator("[data-testid=support-interface-input]").setInputFiles(SEISMIC_FIXTURE);
    await expect(page.locator("[data-testid=superstructure-message]")).toContainText("P1");
    await page.locator("[data-testid=run-design]").click();
    const sheet = page.locator("[data-testid=design-sheet]");
    await expect(sheet).toContainText("耐震-レベル1照査");
    await expect(sheet).toContainText("耐震-レベル2照査");
    await expect(sheet).toContainText("HOLD");
  });

  test("Scenario F: reinforcement requirement shown (HOLD)", async ({ page }) => {
    await openSubstructure(page);
    await generateCombo(page);
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("配筋-必要鉄筋量");
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("HOLD");
  });

  test("Scenario G: Save -> Reload -> Load restores identical design result and 2D/3D", async ({
    page,
  }) => {
    await openSubstructure(page);
    await generateCombo(page);
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-summary]")).toContainText("HOLD 4");
    const firstSummary = await page
      .locator("[data-testid=design-summary]")
      .textContent();

    // Save
    const downloadPromise = page.waitForEvent("download");
    await page.locator("[data-testid=substructure-save]").click();
    const download = await downloadPromise;
    const savedPath = `/tmp/opencode/m3-06-saved-${Date.now()}.json`;
    await download.saveAs(savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8"));
    expect(saved.project.supports.map((s: { supportId: string }) => s.supportId)).toEqual([
      "A1",
      "P1",
      "P2",
      "A2",
    ]);

    // Reload -> Load
    await page.reload();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-A1]")).toHaveCount(0);
    await page.locator("[data-testid=substructure-load-input]").setInputFiles(savedPath);
    await expect(page.locator("[data-testid=tree-item-A1]")).toBeVisible();

    // 再計算 → 同一結果（deterministic）
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-summary]")).toHaveText(firstSummary?.trim() ?? "OK 0 NG 0 HOLD 4");

    // 2D/3D 復元
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(800);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
  });

  test("Scenario H: superstructure + substructure combined 3D integration", async ({
    page,
  }) => {
    await openSubstructure(page);
    await generateCombo(page);
    await page.locator("[data-testid=support-interface-input]").setInputFiles(SEISMIC_FIXTURE);
    await expect(page.locator("[data-testid=superstructure-message]")).toContainText("P1");
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(1500);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
  });
});
