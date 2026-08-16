import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

// Phase C1 (M2-09D) Main/LINER → 下部工計画 メインエントリ E2E
// シナリオ: app起動 → LINER → review → 下部工入口 → SubstructurePlanningPage
// → project/alignment取得 → sample生成 → 2D/3D → property編集 → 戻る → deep link/reload

test.describe("Phase C1 M2-09D substructure main entry", () => {
  test("reaches substructure page from LINER and exercises the full flow", async ({ page }) => {
    // 1. app起動
    await openProAndWait(page);

    // 2. LINERへ移動
    await openLinerList(page);
    await openLinerLauncher(page, "gui");
    await expect(page).toHaveURL("/pro/liner/setup");
    await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();

    // 3. review画面を開く
    await page.locator("[data-testid=liner-setup-tab-review]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-review]")).toBeVisible();

    // 4. LINER 支点を追加してから 下部工入口 をクリック
    await page.locator("[data-testid=add-bridge-pier]").click();
    await page.locator("[data-testid=bridge-pier-station-P1]").fill("30");
    await page.locator("[data-testid=open-substructure-planning]").click();

    // 5. SubstructurePlanningPage表示 + project/alignment取得（LINER支点P1が自動生成）
    await expect(page).toHaveURL("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();

    // 6. sample生成（組合せ A1-P1-P2-A2）
    await page.locator("[data-testid=open-sample-dialog]").click();
    await expect(page.locator("[data-testid=sample-creation-dialog]")).toBeVisible();
    await page.locator("[data-testid=combo-combo-standard]").click();
    await expect(page.locator("[data-testid=tree-item-A1]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P2]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-A2]")).toBeVisible();

    // 7. 3D表示
    await page.locator("[data-testid=view-mode-3d]").click();
    await expect(page.locator("[data-testid=viewport]")).toBeVisible();

    // 8. 2D表示
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=viewport]")).toBeVisible();

    // 9. property編集（P1 門型橋脚の柱幅変更 → リアルタイム反映）
    await page.locator("[data-testid=tree-item-P1]").click();
    await expect(page.locator("[data-testid=portal-pier-form]")).toBeVisible();
    await page.locator("[data-testid=portal-col-1-width] input").fill("2.0");

    // 10. 戻る（LINER setupへ）
    await page.locator("[data-testid=substructure-back]").click();
    await expect(page).toHaveURL("/pro/liner/setup");
    await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();

    // 11. deep link / reload
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
  });

  test("deep link to substructure without LINER data renders safely", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=panel-tree]")).toBeVisible();
    await page.reload();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
  });
});
