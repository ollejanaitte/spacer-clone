import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/p1-d05-liner-ui-save-load";

test.describe("P1-D05 liner UI save/load integration", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("creates a liner draft, reflects preview/mapping, saves canonical JSON, and reloads it", async ({ page }) => {
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

    await page.locator("[data-testid=liner-alignment-id]").fill("alignment-e2e-p1-d05");
    await page.locator("[data-testid=liner-model-id]").fill("liner-e2e-p1-d05");
    await page.locator("[data-testid=liner-element-length-S1]").fill("36");
    await page.locator("[data-testid=liner-setup-tab-station]").click();
    await page.locator("[data-testid=liner-origin-displayed-station]").fill("5");
    await page.locator("[data-testid=liner-station-interval]").fill("6");

    await page.locator("[data-testid=liner-setup-tab-vertical]").click();
    await page.locator("[data-testid=liner-vertical-element-end-station-VG-default]").fill("36");

    await page.locator("[data-testid=liner-setup-tab-crossSection]").click();
    await page.locator("[data-testid=crossfall-interval-row-CF-1] [data-testid=crossfall-interval-end-CF-1]").fill("36");

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    await expect(page.locator("[data-testid=liner-grid-preview]")).toBeVisible();
    await expect(page.getByRole("figure", { name: "X 0.00 - 36.00 / Y 0.00 - 0.00" })).toBeVisible();
    const previewSummary = page.getByRole("complementary", { name: "プレビュー概要" });
    await expect(previewSummary.locator("dt").filter({ hasText: "延長" }).locator("xpath=following-sibling::dd[1]")).toHaveText("36 m");
    await expect(previewSummary.locator("dt").filter({ hasText: "測点" }).locator("xpath=following-sibling::dd[1]")).toHaveText("7 件");

    await page.locator("[data-testid=open-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro/liner/mapping-review");
    await expect(page.locator("[data-testid=liner-mapping-review-page]")).toBeVisible();
    await expect(page.locator("[data-testid=confirm-liner-mapping]")).toBeEnabled();

    await page.locator("[data-testid=close-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.locator("button[title='現在のモデルを project.json として保存します。']").click(),
    ]);
    const savedPath = join(OUT_DIR, "project.json");
    await download.saveAs(savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8"));
    expect(saved.liner?.draft).toBeUndefined();
    expect(saved.liner?.domainDraft?.linerModelId).toBe("liner-e2e-p1-d05");
    expect(saved.liner?.domainDraft?.alignment?.id).toBe("alignment-e2e-p1-d05");
    expect(saved.liner?.domainDraft?.alignment?.elements?.[0]?.length).toBe(36);
    expect(saved.liner?.domainDraft?.stationDefinition?.originDisplayedStation).toBe(5);
    expect(saved.liner?.domainDraft?.stationDefinition?.interval).toBe(6);
    expect(saved.liner?.sourceRevision).toMatch(/^[a-f0-9]{64}$/);

    const roundTripPath = join(OUT_DIR, "project-roundtrip.json");
    writeFileSync(roundTripPath, `${JSON.stringify(saved, null, 2)}\n`);
    await page.getByLabel("開く", { exact: true }).setInputFiles(roundTripPath);
    await page.getByRole("button", { name: "ログ" }).click();
    await expect(page.getByText("project-roundtrip.json opened.")).toBeVisible();
    await page.locator("[data-testid=open-liner-list]").click();
    await expect(page).toHaveURL("/pro/liner");
    await expect(page.locator("[data-testid=liner-list-empty]")).toHaveCount(0);
    await page.locator("[data-testid=open-liner-setup]").click();
    await expect(page).toHaveURL("/pro/liner/setup");

    await expect(page.locator("[data-testid=liner-alignment-id]")).toHaveValue("alignment-e2e-p1-d05");
    await expect(page.locator("[data-testid=liner-model-id]")).toHaveValue("liner-e2e-p1-d05");
    await expect(page.locator("[data-testid=liner-element-length-S1]")).toHaveValue("36");
    await page.locator("[data-testid=liner-setup-tab-station]").click();
    await expect(page.locator("[data-testid=liner-origin-displayed-station]")).toHaveValue("5");
    await expect(page.locator("[data-testid=liner-station-interval]")).toHaveValue("6");
  });
});
