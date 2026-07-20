import { expect, test, type Page } from "@playwright/test";

async function openLinerSetup(page: Page) {
  await page.goto("/pro");
  await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible({
    timeout: 60000,
  });

  await page.locator("[data-testid=open-liner-list]").click();
  await expect(page).toHaveURL("/pro/liner");
  await page.locator("[data-testid=create-liner]").click();
  await expect(page.locator("[data-testid=liner-launcher-page]")).toBeVisible();
  await page.locator("[data-testid=liner-launcher-gui]").click();
  await expect(page).toHaveURL("/pro/liner/setup");
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();
}

test.describe("P4-D05 review diagrams and utilities UI", () => {
  test("P4-E2E-05: review tab shows bridge layout only without confirmation drawing canvas (D05-C01)", async ({
    page,
  }) => {
    await openLinerSetup(page);

    await page.locator("[data-testid=liner-setup-tab-review]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-review]")).toBeVisible();
    await expect(page.locator("[data-testid=add-bridge-pier]")).toBeVisible();
    await expect(page.locator("[data-testid=formal-drawing-preview-document]")).toHaveCount(0);
    await expect(page.locator("[data-testid=drawing-sheet-plan-sheet]")).toHaveCount(0);
  });

  test("preview page promotes formal drawing workspace as secondary entry (D05-C06)", async ({ page }) => {
    await openLinerSetup(page);

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page.locator("[data-testid=liner-preview-page]")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-testid=liner-preview-formal-drawing-notice]")).toBeVisible();
    await expect(page.locator("[data-testid=liner-preview-open-formal-drawings]")).toBeVisible();

    await page.locator("[data-testid=liner-preview-open-formal-drawings]").click();
    await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/pro\/liner\/drawings\//);
    await expect(page.locator("[data-testid=formal-drawing-preview-document]")).toBeVisible();
  });

  test("formal drawing routes render plan, profile, and cross-section sheets (D05-C02)", async ({ page }) => {
    await openLinerSetup(page);

    await page.locator("[data-testid=open-liner-drawings]").click();
    await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-testid=formal-drawing-preview-document]")).toBeVisible();

    await page.getByRole("tab", { name: "縦断線形図" }).click();
    await expect(page.locator("[data-testid=drawing-sheet-profile-sheet]")).toBeVisible();
    await expect(
      page.locator("[data-testid=drawing-sheet-profile-sheet]").getByText("地盤データ未設定").first(),
    ).toBeVisible();

    await page.getByRole("tab", { name: "横断図" }).click();
    await expect(page.locator("[data-testid^=drawing-sheet-cross]")).toBeVisible();
  });
});
