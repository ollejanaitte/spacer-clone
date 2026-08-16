import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

test.describe("mountain 3D viewer", () => {
  test("preview page shows 3D panel + camera presets for the sample", async ({ page }) => {
    await openProAndWait(page);
    await openLinerList(page);
    await openLinerLauncher(page, "sample");
    await expect(page).toHaveURL("/pro/liner/setup");
    await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    // 3D panel appears for the mountain sample
    await expect(page.locator("[data-testid=liner-preview-3d-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=mountain-viewer-preset-overview]")).toBeVisible();
  });
});
