import { expect, test } from "@playwright/test";

test.describe("camera presets visual", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test("capture all camera presets", async ({ page }) => {
    await page.goto("/pro");
    await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible({ timeout: 60000 });
    await page.locator("[data-testid=open-liner-list]").click();
    await page.locator("[data-testid=create-liner]").click();
    await expect(page.locator("[data-testid=liner-launcher-page]")).toBeVisible();
    await page.locator("[data-testid=liner-launcher-sample]").click();
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
