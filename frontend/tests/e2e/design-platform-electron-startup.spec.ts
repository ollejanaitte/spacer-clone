import { expect, test } from "@playwright/test";

/**
 * P6: Design Platform Electron startup-path E2E.
 *
 * G-5: production App は1つ (/app NextApp / canonical PDC Project System)。
 * Electron は /app を canonical entry とし、Lobby の「実務編」は
 * /app/business (canonical 業務一覧) へ導く。
 * /pro/platform (legacy DesignPlatform) は legacy/reference surface。
 */
test.describe("design platform electron startup path", () => {
  test("top -> 実務編 -> /app business list (canonical single app)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();

    // 実務編 must lead to the canonical /app business list (not the legacy FEM shell).
    await page.locator("button:has-text('実務編')").first().click();
    await expect(page).toHaveURL(/\/app\/business$/);
    await expect(page.getByTestId("business-list-page")).toBeVisible();

    // canonical 業務一覧から新規作成フローへ進める
    await page.locator("[data-testid=new-project-button]").click();
    await expect(page).toHaveURL(/\/app\/business\/new$/);
    await expect(page.getByTestId("new-project-page")).toBeVisible();
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
