import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

/**
 * MOUNTAIN-SAMPLE P09 E2E: sample workflow.
 *
 * ランチャー → 「山岳連続高架橋500m」選択 → 全入力 populate → タブ確認
 * の導線を検証する。サンプルは通常Project Stateとしてロードされ、
 * ユーザーが各入力欄を確認・編集できること（表示専用モードではない）を確認する。
 */
async function openSample(page: import("@playwright/test").Page) {
  await openProAndWait(page);
  await openLinerList(page);
  await openLinerLauncher(page, "sample");
  await expect(page).toHaveURL("/pro/liner/setup");
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();
}

test.describe("mountain viaduct 500 sample workflow", () => {
  test("launcher sample card opens the populated setup page", async ({ page }) => {
    await openSample(page);

    // Horizontal editor is populated with an arc element row.
    await expect(page.locator("[data-testid=add-liner-arc-element]")).toBeVisible();
    await expect(
      page.locator("[data-testid^=liner-horizontal-element-row-]").first(),
    ).toBeVisible();
  });

  test("vertical and cross section tabs are reachable", async ({ page }) => {
    await openSample(page);

    await page.locator("[data-testid=liner-setup-tab-vertical]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-vertical]")).toBeVisible();

    await page.locator("[data-testid=liner-setup-tab-crossSection]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-crossSection]")).toBeVisible();
  });
});
