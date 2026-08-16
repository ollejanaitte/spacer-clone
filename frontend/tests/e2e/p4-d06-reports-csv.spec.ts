import { expect, test, type Page } from "@playwright/test";
import { openLinerList, openLinerLauncher, openProAndWait } from "./helpers/app";

async function openLinerSetup(page: Page) {
  await openProAndWait(page);
  await openLinerList(page);
  await openLinerLauncher(page, "gui");
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
