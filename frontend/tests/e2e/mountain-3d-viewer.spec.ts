import { expect, test } from "@playwright/test";

test.describe("mountain 3D viewer", () => {
  test("preview page shows 3D panel + camera presets for the sample", async ({ page }) => {
    await page.goto("/pro");
    await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible({ timeout: 60000 });
    await page.locator("[data-testid=open-liner-list]").click();
    await expect(page).toHaveURL("/pro/liner");
    await page.locator("[data-testid=create-liner]").click();
    await expect(page.locator("[data-testid=liner-launcher-page]")).toBeVisible();
    await page.locator("[data-testid=liner-launcher-sample]").click();
    await expect(page).toHaveURL("/pro/liner/setup");
    await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    // 3D panel appears for the mountain sample
    await expect(page.locator("[data-testid=liner-preview-3d-panel]")).toBeVisible();
    await expect(page.locator("[data-testid=mountain-viewer-preset-overview]")).toBeVisible();
  });
});
