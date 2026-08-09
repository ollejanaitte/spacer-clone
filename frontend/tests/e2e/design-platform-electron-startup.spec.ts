import { expect, test } from "@playwright/test";

/**
 * P6: Design Platform Electron startup-path E2E.
 *
 * Mirrors the real user path: Electron loads http://127.0.0.1:5173/ (pathname "/"),
 * user clicks 実務編, reaches Design Platform Home, creates a business, opens the
 * workspace, and launches each tool binding.
 */
test.describe("design platform electron startup path", () => {
  test("top -> 実務編 -> Design Platform Home -> business -> workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();

    // 実務編 must lead to Design Platform Home (not the legacy FEM shell).
    await page.locator("button:has-text('実務編')").first().click();
    await expect(page).toHaveURL(/\/pro\/platform$/);
    await expect(page.getByRole("heading", { name: "Design Platform" })).toBeVisible();

    // 業務から設計 -> business list
    await page.locator("[data-testid=platform-entry-business]").click();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses$/);
    await expect(
      page.locator("[data-testid=business-list], [data-testid=business-list-empty]").first(),
    ).toBeVisible();

    // New business -> workspace
    await page.locator("[data-testid=business-new]").click();
    await page.locator("[data-testid=business-number-input]").fill("E2E-001");
    await page.locator("[data-testid=business-name-input]").fill("起動経路E2E");
    await page.locator("[data-testid=business-stage-select]").selectOption("road_design");
    await page.locator("[data-testid=business-create-submit]").click();
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses\/[^/]+$/);

    // Workspace tabs present.
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
  });

  test("workspace tool bindings navigate to the existing tools", async ({ page }) => {
    await page.goto("/pro/platform");
    await page.locator("[data-testid=platform-entry-business]").click();
    await page.locator("[data-testid=business-new]").click();
    await page.locator("[data-testid=business-number-input]").fill("E2E-002");
    await page.locator("[data-testid=business-name-input]").fill("バインドE2E");
    await page.locator("[data-testid=business-create-submit]").click();
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();

    // LINER binding
    await page.locator("[data-testid=workspace-tab-road]").click();
    await page.locator("[data-testid=workspace-launch-road]").click();
    await expect(page).toHaveURL(/\/pro\/linear-coordinate$/);

    // Back to workspace via history (popstate retains workspace).
    await page.goBack();
    await expect(page).toHaveURL(/\/pro\/platform\/businesses\//);
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();

    // Apollo binding
    await page.locator("[data-testid=workspace-tab-superstructure]").click();
    await page.locator("[data-testid=workspace-launch-superstructure]").click();
    await expect(page).toHaveURL(/\/pro\/apollo/);
    await page.goBack();
    await expect(page.locator("[data-testid=workspace-save]")).toBeVisible();

    // Analysis (FEM) binding
    await page.locator("[data-testid=workspace-tab-analysis]").click();
    await page.locator("[data-testid=workspace-launch-analysis]").click();
    await expect(page).toHaveURL(/\/pro$/);
  });

  test("Quick Analysis remains reachable from Design Platform Home", async ({ page }) => {
    await page.goto("/pro/platform");
    await expect(page.getByRole("heading", { name: "Design Platform" })).toBeVisible();
    await page.locator("[data-testid=platform-entry-quick-analysis]").click();
    await expect(page).toHaveURL(/\/pro$/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
