import { expect, test } from "@playwright/test";

// Phase C1 (M3-05) 設計計算結果 UI / 成果物 E2E
// 設計計算 → HOLD サマリ → 計算書シート → CSV/JSON 出力

test.describe("Phase C1 M3-05 design result UI", () => {
  test("runs design and shows the HOLD result panel with traceable sheet", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // 下部工を生成
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=combo-combo-standard]").click();
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();

    // 設計計算を実行
    await page.locator("[data-testid=run-design]").click();

    // HOLD サマリ表示
    await expect(page.locator("[data-testid=design-result-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=design-summary]")).toContainText("HOLD 4");
    await expect(page.locator("[data-testid=design-status-badge]")).toHaveText("HOLD");

    // 計算書シート（入力/概算数量/照査 HOLD）
    await expect(page.locator("[data-testid=design-sheet]")).toBeVisible();
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("totalConcreteVolume");
    await expect(page.locator("[data-testid=design-sheet]")).toContainText("HOLD");

    // 支点タブ切替
    await page.locator("[data-testid=design-tab-A2]").click();
    await expect(page.locator("[data-testid=design-status-badge]")).toHaveText("HOLD");
  });

  test("exports the calculation CSV", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=combo-combo-standard]").click();
    await page.locator("[data-testid=run-design]").click();
    await expect(page.locator("[data-testid=design-result-panel]")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.locator("[data-testid=export-design-csv]").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("substructure-design-sheet.csv");
  });
});
