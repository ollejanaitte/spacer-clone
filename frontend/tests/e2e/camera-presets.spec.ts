import { expect, test } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

test.describe("camera presets visual", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test("capture all camera presets", async ({ page }) => {
    await openProAndWait(page);
    await openLinerList(page);
    await openLinerLauncher(page, "sample");
    await expect(page).toHaveURL("/pro/liner/setup");
    await page.locator("[data-testid=open-liner-preview]").click();
    await page.locator("[data-testid=open-liner-main3d]").click();
    await expect(page).toHaveURL("/pro/liner/main3d");
    for (const cam of ["overview","bridge","follow","valley"]) {
      await page.locator(`[data-testid=main3d-camera-${cam}]`).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `/tmp/opencode/cam-${cam}.png` });
    }
  });
});
