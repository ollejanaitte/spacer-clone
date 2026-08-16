import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

/**
 * S3-UX10 E2E: schematic UI integration smoke.
 *
 * Verifies the LINER user journey at the integration-shell level:
 *   プロジェクト → LINER → 入力(setup) → プレビュー(PLAN模式図) → タブ移動
 * (UX-P07 §3, 導線①〜⑥のうち setup + preview 区間).
 *
 * Mirrors the established p1-d05 flow so the app navigation is exercised with
 * real UI data-testids.
 */
async function openSetupPage(page: import("@playwright/test").Page) {
  await openProAndWait(page);
  await openLinerList(page);
  await openLinerLauncher(page, "gui");
  await expect(page).toHaveURL("/pro/liner/setup");
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();
}

test.describe("S3-UX10 schematic UI integration", () => {
  test("setup tabs expose editors (line / vertical / crossSection)", async ({ page }) => {
    await openSetupPage(page);

    // Line tab: horizontal element editor is available.
    await expect(page.locator("[data-testid=liner-setup-tab-line]")).toBeVisible();
    await page.locator("[data-testid=liner-setup-tab-line]").click();
    await expect(page.locator("[data-testid=add-liner-straight-element]")).toBeVisible();

    // Add an arc element -> a row appears.
    await page.locator("[data-testid=add-liner-arc-element]").click();
    await expect(page.locator("[data-testid^=liner-horizontal-element-row-]").first()).toBeVisible();

    // Vertical tab panel.
    await page.locator("[data-testid=liner-setup-tab-vertical]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-vertical]")).toBeVisible();

    // Cross section tab panel.
    await page.locator("[data-testid=liner-setup-tab-crossSection]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-crossSection]")).toBeVisible();
  });

  test("plan schematic renders in the preview page", async ({ page }) => {
    await openSetupPage(page);

    await page.locator("[data-testid=liner-alignment-id]").fill("alignment-e2e-s3-ux10");
    await page.locator("[data-testid=liner-model-id]").fill("liner-e2e-s3-ux10");

    // Open the preview -> PLAN grid schematic is rendered.
    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    await expect(page.locator("[data-testid=liner-grid-preview]")).toBeVisible();
  });
});
