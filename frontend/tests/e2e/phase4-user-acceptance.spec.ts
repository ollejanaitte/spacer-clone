import { expect, test } from "@playwright/test";

/**
 * P6/P7: User acceptance fixes E2E on the real startup path.
 *
 * Verifies:
 *  - empty startup (no Plan A auto-load, empty-state actions)
 *  - sample business explicit create + persistence
 *  - BusinessProject workspace save is enabled and shows feedback
 */
test.describe("phase4 user acceptance fixes", () => {
  test("empty startup: no Plan A auto-load, empty-state shown", async ({ page }) => {
    await page.goto("/pro");
    await expect(page.locator("body")).not.toContainText("5-Span Continuous Viaduct");
    await expect(page.locator("[data-testid=empty-model-state]")).toBeVisible();
    await expect(page.locator("[data-testid=empty-model-new]")).toBeVisible();
    await expect(page.locator("[data-testid=empty-model-open]")).toBeVisible();
    await expect(page.locator("[data-testid=empty-model-sample]")).toBeVisible();
  });

  test("sample business: explicit create -> workspace -> persists", async ({ page }) => {
    await page.goto("/pro/platform/businesses");
    await expect(
      page.locator("[data-testid=business-list], [data-testid=business-list-empty]").first(),
    ).toBeVisible();
    await page.locator("[data-testid=business-sample-create]").click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses\/[^/]+$/);
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();
    await expect(page.locator("body")).toContainText("サンプル業務");

    // Persists after reload (restart equivalent).
    await page.goto("/pro/platform/businesses");
    await expect(page.locator("body")).toContainText("サンプル業務");
  });

  test("BusinessProject workspace save shows feedback and stays enabled", async ({ page }) => {
    await page.goto("/pro/platform/businesses");
    await page.locator("[data-testid=business-new]").click();
    await page.locator("[data-testid=business-number-input]").fill("P7-001");
    await page.locator("[data-testid=business-name-input]").fill("P7保存検証");
    await page.locator("[data-testid=business-create-submit]").click();
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();
    await expect(page.locator("[data-testid=workspace-save]")).toBeEnabled();
    await page.locator("[data-testid=workspace-save]").click();
    await expect(page.locator("[data-testid=workspace-save-feedback]")).toBeVisible();
  });

  test("Quick Analysis save shows success feedback", async ({ page }) => {
    await page.goto("/pro");
    await expect(page.locator("body")).toContainText("モデルがありません");
    const downloadPromise = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.locator("button:has-text('保存')").first().click();
    await page.waitForTimeout(800);
    await expect(page.locator("body")).toContainText("保存しました");
  });
});
