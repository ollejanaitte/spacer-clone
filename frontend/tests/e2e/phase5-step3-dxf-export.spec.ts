import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/phase5-step3-dxf-verification";

async function openFormalDrawingWorkspace(page: Page) {
  await page.goto("/pro");
  await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible({
    timeout: 60000,
  });

  await page.getByRole("button", { name: "線形座標計算" }).click();

  // Toolbar may land on list or launcher depending on project state.
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

async function downloadDxf(page: Page, testId: string, fileName: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.locator(`[data-testid=${testId}]`).click(),
  ]);
  const target = join(OUT_DIR, fileName);
  await download.saveAs(target);
  const content = readFileSync(target, "utf8");
  expect(statSync(target).size).toBeGreaterThan(0);
  expect(content.startsWith("0\nSECTION")).toBe(true);
  expect(content.trimEnd().endsWith("0\nEOF")).toBe(true);
  return { suggested: download.suggestedFilename(), size: statSync(target).size, target };
}

test.describe("Phase 5 Step 3 formal DXF exports", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(join(OUT_DIR, "librecad"), { recursive: true });
  });

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ] as const) {
    test(`exports three DXF files at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openFormalDrawingWorkspace(page);

      await expect(page.locator("[data-testid=formal-drawing-export-plan-dxf]")).toBeEnabled();
      await expect(page.locator("[data-testid=formal-drawing-export-profile-dxf]")).toBeEnabled();
      await expect(page.locator("[data-testid=formal-drawing-export-cross-section-dxf]")).toBeEnabled();
      await expect(page.locator("[data-testid=drawing-sheet-plan-sheet]")).toBeVisible();

      const planFile = viewport.width === 1366 ? "plan.dxf" : `plan-${viewport.width}.dxf`;
      const profileFile = viewport.width === 1366 ? "profile-band.dxf" : `profile-band-${viewport.width}.dxf`;
      const crossFile = viewport.width === 1366 ? "cross-section.dxf" : `cross-section-${viewport.width}.dxf`;

      const plan = await downloadDxf(page, "formal-drawing-export-plan-dxf", planFile);

      await page.getByRole("tab", { name: "縦断線形図" }).click();
      await expect(page.locator("[data-testid=drawing-sheet-profile-sheet]")).toBeVisible();
      const profile = await downloadDxf(page, "formal-drawing-export-profile-dxf", profileFile);

      await page.getByRole("tab", { name: "横断図" }).click();
      await expect(page.locator("[data-testid^=drawing-sheet-cross]")).toBeVisible();
      const cross = await downloadDxf(page, "formal-drawing-export-cross-section-dxf", crossFile);

      await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible();
      await expect(page.locator("[data-testid^=drawing-sheet-]")).toBeVisible();

      writeFileSync(
        join(OUT_DIR, `playwright-${viewport.width}x${viewport.height}.json`),
        JSON.stringify({ viewport, plan, profile, cross }, null, 2),
      );
    });
  }
});
