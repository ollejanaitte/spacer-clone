import { expect, test } from "@playwright/test";

async function createBusiness(page: import("@playwright/test").Page) {
  await page.goto("/pro/platform");
  await expect(page.getByRole("heading", { name: "Design Platform" })).toBeVisible();
  await page.locator("[data-testid=platform-entry-business]").click();
  await expect(page).toHaveURL(/\/pro\/platform\/businesses$/);
  // Empty state (first run) or list table both indicate the business list page.
  await expect(
    page.locator("[data-testid=business-list], [data-testid=business-list-empty]").first(),
  ).toBeVisible();
  await page.locator("[data-testid=business-new]").click();
  await page.locator("[data-testid=business-number-input]").fill("H620164A");
  await page.locator("[data-testid=business-name-input]").fill("E2Eテスト業務");
  await page.locator("[data-testid=business-stage-select]").selectOption("road_design");
  await page.locator("[data-testid=business-create-submit]").click();
  await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();
}

/**
 * Step 4-4-7 / 4-5-4 E2E: Design Platform business + workflow flow.
 */
test.describe("design platform business flow", () => {
  test("create a business, open workspace, save, reopen", async ({ page }) => {
    await createBusiness(page);
    await expect(page.locator("[data-testid=workspace-tab-road]")).toBeVisible();

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

    await page.locator("[data-testid=workspace-tab-road]").click();
    await expect(page.locator("[data-testid=workspace-launch-road]")).toBeVisible();

    await page.locator("[data-testid=workspace-save]").click();

    await page.locator("text=業務一覧へ").click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses$/);
    await expect(page.locator("text=E2Eテスト業務")).toBeVisible();

    await page
      .locator("td:has-text('E2Eテスト業務')")
      .first()
      .locator("..")
      .locator("[data-testid^=business-open-]")
      .click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses\//);
    await expect(page.locator("text=E2Eテスト業務")).toBeVisible();
  });

  test("guided navigation and confirmation gate are present in workspace", async ({ page }) => {
    await createBusiness(page);

    // Guided nav: 戻る is disabled on overview, 次へ advances to road.
    await expect(page.locator("[data-testid=guided-prev]")).toBeDisabled();
    await expect(page.locator("[data-testid=guided-next]")).toBeEnabled();
    await page.locator("[data-testid=guided-next]").click();
    await expect(page.locator("[data-testid=workspace-section-road]")).toBeVisible();

    // Confirmation gate (fail-closed panel) is rendered.
    await expect(page.locator("[data-testid=confirmation-gate]")).toBeVisible();

    // Readiness panel is rendered.
    await expect(page.locator("[data-testid=readiness-panel]")).toBeVisible();
  });
});
