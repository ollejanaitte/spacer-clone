import { expect, test, type Page } from "@playwright/test";

async function openFormalDrawingWorkspace(page: Page) {
  await page.goto("/pro");
  await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible({
    timeout: 60000,
  });

  await page.getByRole("button", { name: "線形座標計算" }).click();

  const launcher = page.locator("[data-testid=liner-launcher-page]");
  const listCreate = page.getByRole("button", { name: "新規作成" }).first();
  if (await listCreate.isVisible().catch(() => false)) {
    await listCreate.click();
  }
  if (!(await launcher.isVisible().catch(() => false))) {
    await page.goto("/pro/linear-coordinate");
  }
  await expect(launcher).toBeVisible({ timeout: 30000 });

  await page.locator("[data-testid=liner-launcher-gui]").click();
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible({ timeout: 30000 });
  await page.locator("[data-testid=open-liner-drawings]").click();
  await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });
}

test.describe("P3-D07 preview / print / DXF parity", () => {
  test("shows print control and preview sheet alongside DXF export on each route", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await openFormalDrawingWorkspace(page);

    await expect(page.locator("[data-testid=formal-drawing-print-active-sheet]")).toBeEnabled();
    await expect(page.locator("[data-testid=formal-drawing-preview-document]")).toBeVisible();
    await expect(page.locator("[data-testid=drawing-sheet-plan-sheet]")).toBeVisible();
    await expect(page.locator("[data-testid=formal-drawing-export-plan-dxf]")).toBeEnabled();

    await page.getByRole("tab", { name: "縦断線形図" }).click();
    await expect(page.locator("[data-testid=drawing-sheet-profile-sheet]")).toBeVisible();
    await expect(page.locator("[data-testid=formal-drawing-print-active-sheet]")).toBeEnabled();
    await expect(page.locator("[data-testid=formal-drawing-export-profile-dxf]")).toBeEnabled();

    await page.getByRole("tab", { name: "横断図" }).click();
    await expect(page.locator("[data-testid^=drawing-sheet-cross]")).toBeVisible();
    await expect(page.locator("[data-testid=formal-drawing-print-active-sheet]")).toBeEnabled();
    await expect(page.locator("[data-testid=formal-drawing-export-cross-section-dxf]")).toBeEnabled();
  });
});
