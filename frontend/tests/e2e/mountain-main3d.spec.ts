import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

/**
 * MAIN3D P08 E2E: mountain sample -> main 3D viewer.
 *
 * ランチャー → サンプル選択 → プレビュー → 「統合3D表示」→ main 3D
 * → モデル切替 / レイヤーON/OFF / カメラ / サポート選択 を検証する。
 */
async function openMain3D(page: import("@playwright/test").Page) {
  await openProAndWait(page);
  await openLinerList(page);
  await openLinerLauncher(page, "sample");
  await expect(page).toHaveURL("/pro/liner/setup");
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();

  await page.locator("[data-testid=open-liner-preview]").click();
  await expect(page).toHaveURL("/pro/liner/preview");
  await page.locator("[data-testid=open-liner-main3d]").click();
  await expect(page).toHaveURL("/pro/liner/main3d");
  await expect(page.locator("[data-testid=liner-main3d-page]")).toBeVisible();
}

test.describe("mountain main 3D viewer", () => {
  test("opens integrated 3D from the sample preview", async ({ page }) => {
    await openMain3D(page);
    await expect(page.locator("[data-testid=mountain-viewer]")).toBeVisible();
    await expect(page.locator("[data-testid=main3d-mode-integrated]")).toBeVisible();
    await expect(page.locator("[data-testid=main3d-layer-terrain]")).toBeVisible();
    await expect(page.locator("[data-testid=main3d-camera-valley]")).toBeVisible();
  });

  test("model switch and layer toggle work", async ({ page }) => {
    await openMain3D(page);

    // switch to bridge model -> superstructure + substructure layers on
    await page.locator("[data-testid=main3d-mode-bridge]").click();
    await expect(page.locator("[data-testid=main3d-layer-superstructure]")).toBeChecked();
    await expect(page.locator("[data-testid=main3d-layer-terrain]")).not.toBeChecked();

    // toggle substructure off
    await page.locator("[data-testid=main3d-layer-substructure]").click();
    await expect(page.locator("[data-testid=main3d-layer-substructure]")).not.toBeChecked();
  });

  test("support selection highlights P4", async ({ page }) => {
    await openMain3D(page);

    await page.locator("[data-testid=main3d-select-P4]").click();
    await expect(page.locator("[data-testid=main3d-selection-current]")).toHaveText(/P4/);
    await page.locator("[data-testid=main3d-select-P4]").click();
    await expect(page.locator("[data-testid=main3d-selection-current]")).toHaveText(/選択なし/);
  });
});
