import { expect, test } from "@playwright/test";

/**
 * Step 4-4-7 E2E: Design Platform business flow.
 *
 * /pro/platform -> 業務一覧 -> 新規業務 -> Workspace -> Save -> 一覧へ戻る -> 開く -> 復元
 */
test.describe("design platform business flow", () => {
  test("create a business, open workspace, save, reopen", async ({ page }) => {
    await page.goto("/pro/platform");
    await expect(
      page.getByRole("heading", { name: "Design Platform" }),
    ).toBeVisible();

    await page.locator("[data-testid=platform-entry-business]").click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses$/);
    await expect(page.locator("[data-testid=business-list]")).toBeVisible();

    await page.locator("[data-testid=business-new]").click();
    await page.locator("[data-testid=business-number-input]").fill("H620164A");
    await page.locator("[data-testid=business-name-input]").fill("E2Eテスト業務");
    await page.locator("[data-testid=business-stage-select]").selectOption("road_design");
    await page.locator("[data-testid=business-create-submit]").click();

    // Creation navigates into the workspace.
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();
    await expect(page.locator("[data-testid=workspace-tab-road]")).toBeVisible();

    // Workspace tabs are all present.
    for (const section of [
      "overview",
      "road",
      "superstructure",
      "substructure",
      "analysis",
      "main3d",
      "deliverables",
      "data",
    ]) {
      await expect(page.locator(`[data-testid=workspace-tab-${section}]`)).toBeVisible();
    }

    // Launch action is available on tool-bound sections.
    await page.locator("[data-testid=workspace-tab-road]").click();
    await expect(page.locator("[data-testid=workspace-launch-road]")).toBeVisible();

    // Save.
    await page.locator("[data-testid=workspace-save]").click();

    // Back to the list and reopen the same business.
    await page.locator("text=業務一覧へ").click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses$/);
    await expect(page.locator("text=E2Eテスト業務")).toBeVisible();

    await page.locator("td:has-text('E2Eテスト業務')").first().locator("..").locator("[data-testid^=business-open-]").click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses\//);
    await expect(page.locator("text=E2Eテスト業務")).toBeVisible();
  });
});
