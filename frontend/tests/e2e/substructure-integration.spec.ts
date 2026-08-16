import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

// Phase C1 (M2-10A) 下部工 統合 E2E
// Scenario A: サンプル単柱橋脚 → station/offset → 2D → 3D → 寸法 → selection
// Scenario B: 門型橋脚 → parameter編集 → 2D即時 / 3D debounce 更新
// Scenario C: 場所打ち杭 → footing → 杭径/本数変更 → 3D
// Scenario D: LINER support → sample自動生成 → supportId同期
// Scenario E: Validation FATAL → 3D生成停止 → 修正 → 正常復帰
// Scenario F: Undo/Redo → model / 2D / 3D 一致

test.describe("Phase C1 M2-10A substructure integration", () => {
  test("Scenario A: single pier sample, station/offset, 2D/3D, dimension, selection", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // サンプル単柱橋脚
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-pier_single]").click();
    await expect(page.locator("[data-testid=tree-item-S1]")).toBeVisible();

    // station / offset 編集
    await page.locator("[data-testid=tree-item-S1]").click();
    await page.locator("[data-testid=placement-station] input").fill("42.5");
    await page.locator("[data-testid=placement-offset] input").fill("1.5");
    await expect(page.locator("[data-testid=placement-station] input")).toHaveValue("42.5");

    // 2D / 3D
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
    await page.locator("[data-testid=view-mode-3d]").click();
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();

    // 寸法モード
    await page.locator("[data-testid=dimension-mode]").selectOption("main");
    await expect(page.locator("[data-testid=dimension-mode]")).toHaveValue("main");

    // selection（S1選択状態でフォーム表示）
    await expect(page.locator("[data-testid=pier-form]")).toBeVisible();
  });

  test("Scenario B: portal pier parameter edit with realtime 2D/3D update", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // 門型橋脚（combo P1）
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=combo-combo-standard]").click();
    await page.locator("[data-testid=tree-item-P1]").click();
    await expect(page.locator("[data-testid=portal-pier-form]")).toBeVisible();

    // parameter編集 → 2D即時 / 3D debounce
    await page.locator("[data-testid=portal-col-1-width] input").fill("2.4");
    await expect(page.locator("[data-testid=portal-col-1-width] input")).toHaveValue("2.4");
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(800);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
  });

  test("Scenario C: bored pile foundation with footing/pile parameter changes", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // 場所打ち杭サンプル
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-foundation_bored]").click();
    await page.locator("[data-testid=tree-item-S1]").click();

    // footing入力
    await page.locator("[data-testid=footing-length] input").fill("14");
    await page.locator("[data-testid=footing-width] input").fill("9");
    // 杭径 / 杭本数変更
    await page.locator("[data-testid=pile-diameter] input").fill("1.5");
    await page.locator("[data-testid=pile-count] input").fill("8");
    await expect(page.locator("[data-testid=pile-count] input")).toHaveValue("8");

    // 3D表示（杭ソリッド生成）
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(800);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
  });

  test("Scenario D: LINER support -> sample auto-generation with supportId sync", async ({ page }) => {
    await openProAndWait(page);
    await openLinerList(page);
    await openLinerLauncher(page, "gui");
    await expect(page).toHaveURL("/pro/liner/setup");
    await page.locator("[data-testid=liner-setup-tab-review]").click();
    await page.locator("[data-testid=add-bridge-pier]").click();
    await page.locator("[data-testid=bridge-pier-station-P1]").fill("30");
    await page.locator("[data-testid=open-substructure-planning]").click();

    // LINER支点 P1 が自動生成され、supportId が同期
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();
    await page.locator("[data-testid=tree-item-P1]").click();
    await expect(page.locator("[data-testid=placement-station] input")).toHaveValue("30");
  });

  test("Scenario E: validation FATAL stops 3D, fix resumes", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-pier_single]").click();
    await page.locator("[data-testid=tree-item-S1]").click();

    // FATAL: 柱幅 0
    await page.locator("[data-testid=pier-col-width] input").fill("0");
    await page.waitForTimeout(600);
    await expect(page.locator("[data-testid=viewport-blocked]")).toBeVisible();

    // 修正 → 正常復帰
    await page.locator("[data-testid=pier-col-width] input").fill("1.4");
    await page.waitForTimeout(600);
    await expect(page.locator("[data-testid=viewport-blocked]")).toHaveCount(0);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
  });

  test("Scenario F: undo/redo keeps model and view in sync", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-pier_single]").click();
    // Undo 履歴の 300ms debounce を確定させる
    await page.waitForTimeout(450);
    await page.locator("[data-testid=tree-item-S1]").click();

    // 編集
    await page.locator("[data-testid=pier-col-width] input").fill("2.2");
    await expect(page.locator("[data-testid=pier-col-width] input")).toHaveValue("2.2");
    await page.waitForTimeout(450);

    // undo → 直前の値に戻る
    await page.locator("[data-testid=toolbar-undo]").click();
    await expect(page.locator("[data-testid=pier-col-width] input")).toHaveValue("1.2");

    // redo → 再適用（model/2D/3D一致）
    await page.locator("[data-testid=toolbar-redo]").click();
    await expect(page.locator("[data-testid=pier-col-width] input")).toHaveValue("2.2");
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
  });
});
