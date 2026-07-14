import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/phase5-japanese-drawing-remediation";

async function openLinerEdit(page: Page) {
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
  expect(content).not.toMatch(/NaN|Infinity/);
  return { suggested: download.suggestedFilename(), size: statSync(target).size, target };
}

test.describe("Phase 5 Japanese drawing remediation UI", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ] as const) {
    test(`line/station/profile/offset and formal drawings at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openLinerEdit(page);

      await page.getByRole("tab", { name: "ライン" }).click();
      await expect(page.locator("[data-testid=add-liner-straight-element]")).toBeVisible();
      await expect(page.locator("[data-testid=add-liner-arc-element]")).toBeVisible();

      await page.getByRole("tab", { name: "測点" }).click();
      await expect(page.locator("[data-testid=add-liner-explicit-station]")).toBeVisible();

      await page.getByRole("tab", { name: "縦断" }).click();
      await expect(page.locator("[data-testid=add-liner-grade-element]")).toBeVisible();
      await expect(page.locator("[data-testid=add-liner-parabolic-element]")).toBeVisible();

      await page.getByRole("tab", { name: "横断" }).click();
      await expect(page.locator("[data-testid=insert-cross-section-offset-line-before]")).toBeVisible();
      await expect(page.locator("[data-testid=insert-cross-section-offset-line-after]")).toBeVisible();
      await expect(page.locator("[data-testid=add-cross-section-offset-line]")).toBeVisible();

      const rows = page.locator("[data-testid^=cross-section-offset-line-row-]");
      const initialCount = await rows.count();
      expect(initialCount).toBeGreaterThan(0);

      // Default draft may only have centerline (offset=0); insert a movable row first.
      await page.locator("[data-testid=insert-cross-section-offset-line-after]").click();
      await expect(rows).toHaveCount(initialCount + 1);

      const firstNonCenter = page
        .locator("[data-testid^=cross-section-offset-line-row-][data-centerline='false']")
        .first();
      await firstNonCenter.click();
      const rowTestId = await firstNonCenter.getAttribute("data-testid");
      const idToken = rowTestId!.replace("cross-section-offset-line-row-", "");
      await expect(page.locator(`[data-testid=move-up-cross-section-offset-line-${idToken}]`)).toBeVisible();
      await expect(page.locator(`[data-testid=move-down-cross-section-offset-line-${idToken}]`)).toBeVisible();
      await expect(page.locator(`[data-testid=remove-cross-section-offset-line-${idToken}]`)).toBeEnabled();

      const centerRow = page.locator("[data-testid^=cross-section-offset-line-row-][data-centerline='true']").first();
      const centerId = (await centerRow.getAttribute("data-testid"))!.replace(
        "cross-section-offset-line-row-",
        "",
      );
      await expect(page.locator(`[data-testid=remove-cross-section-offset-line-${centerId}]`)).toBeDisabled();
      await expect(page.locator(`[data-testid=move-up-cross-section-offset-line-${centerId}]`)).toBeDisabled();

      await page.screenshot({
        path: join(
          OUT_DIR,
          viewport.width === 1366 ? "line-station-profile-ui-1366.png" : "line-station-profile-ui-1920.png",
        ),
        fullPage: true,
      });
      await page.screenshot({
        path: join(
          OUT_DIR,
          viewport.width === 1366 ? "offset-editor-1366.png" : "offset-editor-1920.png",
        ),
      });

      const movable = page.locator("[data-testid^=move-down-cross-section-offset-line-]:not([disabled])").first();
      if ((await movable.count()) > 0) {
        await movable.click();
      } else {
        const moveUp = page.locator("[data-testid^=move-up-cross-section-offset-line-]:not([disabled])").first();
        if ((await moveUp.count()) > 0) {
          await moveUp.click();
        }
      }
      await page.screenshot({ path: join(OUT_DIR, "offset-editor-reordered.png") });

      await page.locator("[data-testid=open-liner-drawings]").click();
      await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });

      await expect(page.locator("[data-testid=formal-plan-type-road-shape]")).toBeVisible();
      await expect(page.locator("[data-testid=formal-plan-type-centerline-only]")).toBeVisible();
      await expect(page.locator("[data-testid=formal-drawing-export-plan-type-a-dxf]")).toBeEnabled();
      await expect(page.locator("[data-testid=formal-drawing-export-plan-type-b-dxf]")).toBeEnabled();

      if (viewport.width === 1366) {
        await page.locator("[data-testid=formal-plan-type-road-shape]").check();
        await page.screenshot({ path: join(OUT_DIR, "plan-type-a-1366.png") });
        await downloadDxf(page, "formal-drawing-export-plan-type-a-dxf", "plan-type-a.dxf");

        await page.locator("[data-testid=formal-plan-type-centerline-only]").check();
        await expect(page.locator("[data-testid^=drawing-sheet-]")).toBeVisible();
        await page.screenshot({ path: join(OUT_DIR, "plan-type-b-1366.png") });
        await downloadDxf(page, "formal-drawing-export-plan-type-b-dxf", "plan-type-b-centerline.dxf");

        await page.getByRole("tab", { name: "縦断線形図" }).click();
        await expect(page.locator("[data-testid=drawing-sheet-profile-sheet]")).toBeVisible();
        await page.screenshot({ path: join(OUT_DIR, "profile-bands-1366.png") });
        await downloadDxf(page, "formal-drawing-export-profile-dxf", "profile-band.dxf");

        await page.getByRole("tab", { name: "横断図" }).click();
        await downloadDxf(page, "formal-drawing-export-cross-section-dxf", "cross-section.dxf");
      } else {
        await page.locator("[data-testid=formal-plan-type-centerline-only]").check();
        await page.screenshot({ path: join(OUT_DIR, "plan-type-b-1920.png") });
        await page.getByRole("tab", { name: "縦断線形図" }).click();
        await page.screenshot({ path: join(OUT_DIR, "profile-bands-1920.png") });
      }

      const overflow = await page.evaluate(() => {
        const root = document.querySelector("[data-testid=liner-formal-workspace-page]") as HTMLElement | null;
        if (!root) {
          return { scrollWidth: 0, clientWidth: 0 };
        }
        return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 48);

      writeFileSync(
        join(OUT_DIR, `playwright-${viewport.width}x${viewport.height}.json`),
        JSON.stringify({ viewport, overflow }, null, 2),
      );
    });
  }
});
