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

test.describe("P4-D06 reports and CSV export", () => {
  test("preview page exposes HTML report export control (D06-C05)", async ({ page }) => {
    await openLinerSetup(page);

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page.locator("[data-testid=liner-preview-page]")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-testid=liner-preview-road-export-html]")).toBeVisible();
    await expect(page.locator("[data-testid=liner-preview-road-export-csv]")).toBeVisible();

    await page.locator("[data-testid=liner-preview-road-export-html]").click();
    await expect(page.locator("[data-testid=liner-preview-road-export-message]")).toContainText(
      "HTML計算書をダウンロードしました",
    );
  });

  test("formal drawing workspace exposes CSV export control (D06-C05)", async ({ page }) => {
    await openLinerSetup(page);

    await page.locator("[data-testid=open-liner-drawings]").click();
    await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-testid=formal-drawing-road-export-csv]")).toBeVisible();

    await page.locator("[data-testid=formal-drawing-road-export-csv]").click();
    await expect(page.locator("[data-testid=formal-drawing-road-export-message]")).toContainText(
      "CSVファイルをダウンロードしました",
    );
  });
});
