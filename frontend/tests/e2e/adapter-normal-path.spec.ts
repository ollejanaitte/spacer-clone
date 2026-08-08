import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Phase C1 (A-06) 正常系 E2E — 橋脚モデル → Adapter → TEST Engine → Result → UI → Save/Load 再表示

test.describe("Phase C1 A-06 adapter normal-path round trip", () => {
  test("pier -> adapter input -> test engine -> result -> UI -> save -> reload -> load -> identical redisplay", async ({
    page,
  }) => {
    // 1. App 起動
    await page.goto("/pro");
    await expect(
      page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" }),
    ).toBeVisible({ timeout: 60000 });

    // 2. LINER / 下部工画面へ到達
    await page.locator("[data-testid=open-liner-list]").click();
    await page.locator("[data-testid=create-liner]").click();
    await page.locator("[data-testid=liner-launcher-gui]").click();
    await page.locator("[data-testid=liner-setup-tab-review]").click();
    await page.locator("[data-testid=add-bridge-pier]").click();
    await page.locator("[data-testid=bridge-pier-station-P1]").fill("30");
    await page.locator("[data-testid=open-substructure-planning]").click();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // 3. 橋脚モデル生成（LINER 支点 → 単柱矩形 P1）
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();

    // 4. 橋脚を選択
    await page.locator("[data-testid=tree-item-P1]").click();

    // 5. Adapter Input 生成 + 6. Test Engine 実行
    // 7. Result 受信
    await page.locator("[data-testid=run-adapter-test]").click();

    // 8. UI に TEST/MOCK 結果表示
    await expect(page.locator("[data-testid=adapter-result-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=adapter-summary]")).toContainText("PASS 1");
    await expect(page.locator("[data-testid=adapter-engine-label]")).toHaveText("TEST");
    await expect(page.locator("[data-testid=adapter-status-badge]")).toHaveText("TEST PASS");
    await expect(page.locator("[data-testid=adapter-formal-notice]")).toContainText(
      "正式な構造安全性の設計判定ではありません",
    );
    const calculationId = (await page.locator("[data-testid=adapter-calculation-id]").textContent()) ?? "";

    // 9. Project Save
    const downloadPromise = page.waitForEvent("download");
    await page.locator("[data-testid=substructure-save]").click();
    const download = await downloadPromise;
    const savedPath = `/tmp/opencode/a-06-saved-${Date.now()}.json`;
    await download.saveAs(savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8"));
    expect(saved.schemaVersion).toBe("0.1.0");
    expect(saved.calculation.engineType).toBe("test-mock");
    expect(saved.calculation.results.P1.calculationId).toBe(calculationId);

    // 10. Reload（再起動相当）
    await page.reload();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P1]")).toHaveCount(0);

    // 11. Project Load
    await page.locator("[data-testid=substructure-load-input]").setInputFiles(savedPath);

    // 12. 同一橋脚モデル再表示
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();

    // 13. 同一 Result 再表示
    await expect(page.locator("[data-testid=adapter-result-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=adapter-status-badge]")).toHaveText("TEST PASS");
    await expect(page.locator("[data-testid=adapter-engine-label]")).toHaveText("TEST");

    // 14. supportId / calculationId 一致
    await expect(page.locator("[data-testid=adapter-support-id]")).toHaveText("P1");
    await expect(page.locator("[data-testid=adapter-calculation-id]")).toHaveText(calculationId);

    // 15. 2D/3D モデルが引き続き表示される
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(1000);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();
  });

  test("recompute updates the result (deterministic + model change reflected)", async ({
    page,
  }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=sample-pier_single]").click();
    await expect(page.locator("[data-testid=tree-item-S1]")).toBeVisible();

    await page.locator("[data-testid=run-adapter-test]").click();
    await expect(page.locator("[data-testid=adapter-status-badge]")).toHaveText("TEST PASS");
    const idBefore = await page.locator("[data-testid=adapter-calculation-id]").textContent();

    // 柱幅変更 → モデル変化 → 再計算
    await page.locator("[data-testid=tree-item-S1]").click();
    await page.locator("[data-testid=pier-col-width] input").fill("2.5");
    await page.waitForTimeout(500);
    await page.locator("[data-testid=run-adapter-test]").click();
    await expect(page.locator("[data-testid=adapter-status-badge]")).toHaveText("TEST PASS");
    const idAfter = await page.locator("[data-testid=adapter-calculation-id]").textContent();
    expect(idAfter).not.toBe(idBefore);
  });
});
