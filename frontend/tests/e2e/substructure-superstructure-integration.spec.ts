import { expect, test } from "@playwright/test";
import { join } from "node:path";

// Phase C1 (M3-02) 上部工 + 下部工 3D 統合 E2E
// 上部工 support-interface を接続し、同一 3D シーンに上部工簡易外形を表示する。

const FIXTURE = join(
  __dirname,
  "fixtures",
  "reference-bridge-001-support-interface.json",
);

test.describe("Phase C1 M3-02 superstructure + substructure integration", () => {
  test("imports a support-interface and renders the superstructure envelope in 3D", async ({
    page,
  }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();

    // 下部工（組合せサンプル）を生成
    await page.locator("[data-testid=open-sample-dialog]").click();
    await page.locator("[data-testid=combo-combo-standard]").click();
    await expect(page.locator("[data-testid=tree-item-P1]")).toBeVisible();

    // 上部工 support-interface を接続
    await page.locator("[data-testid=support-interface-input]").setInputFiles(FIXTURE);
    await expect(page.locator("[data-testid=superstructure-message]")).toBeVisible();
    await expect(page.locator("[data-testid=superstructure-message]")).toContainText("PR1");

    // 3D 表示（上部工+下部工 同一シーン）
    await page.locator("[data-testid=view-mode-3d]").click();
    await page.waitForTimeout(1200);
    await expect(page.locator("[data-testid=substructure-viewport]")).toBeVisible();

    // 2D 表示にも投影される
    await page.locator("[data-testid=view-mode-2d]").click();
    await expect(page.locator("[data-testid=plan-preview-svg]")).toBeVisible();
  });

  test("rejects an invalid support-interface (fail-closed)", async ({ page }) => {
    await page.goto("/pro/liner/substructure");
    await expect(page.locator("[data-testid=substructure-planning-page]")).toBeVisible();
    await page
      .locator("[data-testid=support-interface-input]")
      .setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify({ schemaVersion: "9.9.9", supportId: "" })),
      });
    await expect(page.locator("[data-testid=superstructure-message]")).toContainText("失敗");
  });
});
