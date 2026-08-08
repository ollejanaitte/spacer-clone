import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Phase C1 (M3-01) プロジェクト永続化 E2E — Save → Reload → Load round-trip

test.describe("Phase C1 M3-01 substructure persistence", () => {
  test("saves project JSON, reloads the page, and restores supports via load", async ({ page }) => {
    // 1. 下部工画面へ
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // 2. 組合せサンプルを生成
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=combo-combo-standard]").click();
    await expect(page.locator("[data-testid=tree-item-A1]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-A2]")).toBeVisible();

    // 3. 保存（ダウンロードを捕捉）
    const downloadPromise = page.waitForEvent("download");
    await page.locator("[data-testid=substructure-save]").click();
    const download = await downloadPromise;
    const savePath = download.suggestedFilename();
    expect(savePath).toBe("substructure-project.json");
    const saveDir = `/tmp/opencode/m3-01-e2e-${Date.now()}.json`;
    await download.saveAs(saveDir);
    const saved = JSON.parse(readFileSync(saveDir, "utf8"));
    expect(saved.schemaVersion).toBe("0.1.0");
    expect(saved.project.schemaVersion).toBe("0.2.0");
    expect(saved.project.supports.map((s: { supportId: string }) => s.supportId)).toEqual([
      "A1",
      "P1",
      "P2",
      "A2",
    ]);

    // 4. Reload（状態リセット）
    await page.reload();
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-A1]")).toHaveCount(0);

    // 5. Load で復元
    await page.locator("[data-testid=substructure-load-input]").setInputFiles(saveDir);
    await expect(page.locator("[data-testid=tree-item-A1]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-P2]")).toBeVisible();
    await expect(page.locator("[data-testid=tree-item-A2]")).toBeVisible();

    // 6. 復元状態が 2D に表示される
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
  });
});
