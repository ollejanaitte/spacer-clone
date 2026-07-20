import { expect, test, type Download, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/p4-d02-ldist";
const GEOMETRY_EXTENSION_KEY = "spacer.liner/domain-draft-vnext-geometry";
const MODEL_ID = "liner-p4-d02";

type SavedProject = {
  liner?: {
    draft?: unknown;
    domainDraft?: unknown;
    roadDesignDocument?: {
      documentKind?: string;
      ldistCapability?: { state?: string };
      extensions?: Record<string, { json?: { domainDraft?: Record<string, unknown> } }>;
    };
  };
};

type LdistJobSaved = {
  id?: string;
  distanceMode?: string;
  referenceLineId?: string;
  pairs?: Array<{ fromLineId?: string; toLineId?: string }>;
};

function readGeometryDomainDraft(saved: SavedProject): Record<string, unknown> | undefined {
  const extension = saved.liner?.roadDesignDocument?.extensions?.[GEOMETRY_EXTENSION_KEY];
  return extension?.json?.domainDraft;
}

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

  await page.locator("[data-testid=liner-model-id]").fill(MODEL_ID);
}

async function navigateToProForSave(page: Page) {
  await page.locator("[data-testid=open-liner-mapping-review]").click();
  await expect(page).toHaveURL("/pro/liner/mapping-review");
  await expect(page.locator("[data-testid=liner-mapping-review-page]")).toBeVisible();
  await page.locator("[data-testid=close-liner-mapping-review]").click();
  await expect(page).toHaveURL("/pro");
}

async function saveProjectJson(page: Page, savedPath: string) {
  await navigateToProForSave(page);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.locator("button[title='現在のモデルを project.json として保存します。']").click(),
  ]);
  await download.saveAs(savedPath);
}

async function collectCsvDownloads(page: Page, trigger: () => Promise<void>): Promise<Download[]> {
  const downloads: Download[] = [];
  const listener = (download: Download) => {
    downloads.push(download);
  };
  page.on("download", listener);
  try {
    await trigger();
    await expect(page.locator("[data-testid=liner-preview-road-export-message]")).toContainText(
      "CSVファイルをダウンロードしました",
      { timeout: 15000 },
    );
    await page.waitForTimeout(500);
  } finally {
    page.off("download", listener);
  }
  return downloads;
}

async function ensureDistinctOffsetLines(page: Page): Promise<{ leftLineId: string; rightLineId: string }> {
  await page.locator("[data-testid=liner-setup-tab-line]").click();
  const lineRows = page.locator("[data-testid^=liner-line-row-OL-]");
  while ((await lineRows.count()) < 2) {
    await page.locator("[data-testid=liner-line-add]").click();
  }
  await expect(lineRows).toHaveCount(2, { timeout: 10000 });
  const leftLineId =
    (await lineRows.nth(0).getAttribute("data-testid"))?.replace("liner-line-row-", "") ?? "";
  const rightLineId =
    (await lineRows.nth(1).getAttribute("data-testid"))?.replace("liner-line-row-", "") ?? "";
  expect(leftLineId.length).toBeGreaterThan(0);
  expect(rightLineId.length).toBeGreaterThan(0);

  await page.locator("[data-testid=liner-setup-tab-crossSection]").click();
  await page.locator(`[data-testid=cross-section-offset-line-offset-${leftLineId}]`).fill("-5");
  await page.locator(`[data-testid=cross-section-offset-line-offset-${rightLineId}]`).fill("5");

  return { leftLineId, rightLineId };
}

test.describe("P4-D02 LDIST utilities (P4-E2E-02)", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("P4-E2E-02: LDIST results visible and CSV download includes ldist_results.csv", async ({ page }) => {
    test.setTimeout(180000);
    await openLinerSetup(page);
    const { leftLineId, rightLineId } = await ensureDistinctOffsetLines(page);

    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await page.locator("[data-testid=ldist-job-add]").click();
    const jobRow = page.locator("[data-testid^=ldist-job-row-]").first();
    const jobId = ((await jobRow.getAttribute("data-testid")) ?? "").replace("ldist-job-row-", "");
    expect(jobId.length).toBeGreaterThan(0);

    await page.locator(`[data-testid=ldist-pair-from-${jobId}-0]`).selectOption(leftLineId);
    await page.locator(`[data-testid=ldist-pair-to-${jobId}-0]`).selectOption(rightLineId);
    await expect(page.locator("[data-testid=ldist-result-row]").first()).toBeVisible({ timeout: 15000 });

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page.locator("[data-testid=liner-preview-page]")).toBeVisible({ timeout: 30000 });
    await expect(page.locator("[data-testid=liner-preview-road-export-csv]")).toBeVisible();

    const downloads = await collectCsvDownloads(page, async () => {
      await page.locator("[data-testid=liner-preview-road-export-csv]").click();
    });
    expect(downloads.length).toBeGreaterThan(0);

    const csvDir = join(OUT_DIR, "csv-export");
    mkdirSync(csvDir, { recursive: true });
    let ldistCsvFound = false;
    for (const [index, download] of downloads.entries()) {
      const fileName = download.suggestedFilename();
      const targetPath = join(csvDir, fileName || `export-${index}.csv`);
      await download.saveAs(targetPath);
      const content = readFileSync(targetPath, "utf8");
      if (fileName.includes("ldist_results") || content.includes("jobId")) {
        ldistCsvFound = true;
        expect(content).toContain(jobId);
        expect(content).toContain("jobId");
      }
    }
    expect(ldistCsvFound).toBe(true);
  });

  test("Mode A/B results, save/reload recalc, and alignment switch", async ({ page }) => {
    test.setTimeout(180000);
    await openLinerSetup(page);
    const { leftLineId, rightLineId } = await ensureDistinctOffsetLines(page);

    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-utilities]")).toBeVisible();
    await page.locator("[data-testid=ldist-job-add]").click();
    const jobRow = page.locator("[data-testid^=ldist-job-row-]").first();
    const jobId = ((await jobRow.getAttribute("data-testid")) ?? "").replace("ldist-job-row-", "");
    expect(jobId.length).toBeGreaterThan(0);

    await page.locator(`[data-testid=ldist-pair-from-${jobId}-0]`).selectOption(leftLineId);
    await page.locator(`[data-testid=ldist-pair-to-${jobId}-0]`).selectOption(rightLineId);
    await expect(page.locator("[data-testid=ldist-result-row]").first()).toBeVisible({ timeout: 15000 });
    const modeACount = await page.locator("[data-testid=ldist-result-row]").count();
    expect(modeACount).toBeGreaterThan(0);

    await page.locator(`[data-testid=ldist-job-distance-mode-${jobId}]`).selectOption("mode_b");
    await page.locator(`[data-testid=ldist-job-reference-line-${jobId}]`).selectOption(leftLineId);
    await expect(page.locator("[data-testid=ldist-result-row]").first()).toBeVisible({ timeout: 15000 });
    const modeBCount = await page.locator("[data-testid=ldist-result-row]").count();
    expect(modeBCount).toBeGreaterThan(0);

    await page.locator("[data-testid=liner-setup-tab-line]").click();
    const alignmentRows = page.locator("[data-testid^=liner-alignment-row-]");
    await expect(alignmentRows.first()).toBeVisible({ timeout: 10000 });
    const firstAlignmentId =
      (await alignmentRows.nth(0).getAttribute("data-testid"))?.replace("liner-alignment-row-", "") ?? "";
    expect(firstAlignmentId.length).toBeGreaterThan(0);
    await page.locator("[data-testid=liner-alignment-add]").click();
    await expect(alignmentRows).toHaveCount(2, { timeout: 10000 });
    const secondAlignmentId =
      (await alignmentRows.nth(1).getAttribute("data-testid"))?.replace("liner-alignment-row-", "") ?? "";
    expect(secondAlignmentId.length).toBeGreaterThan(0);

    await page.locator("[data-testid=liner-setup-tab-line]").click();
    await page.locator(`[data-testid=liner-alignment-select-${firstAlignmentId}]`).click();
    await page.locator(`[data-testid=liner-line-select-${leftLineId}]`).click();
    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await expect(page.locator(`[data-testid=ldist-job-row-${jobId}]`)).toBeVisible();

    const savedPath = join(OUT_DIR, "project.json");
    await saveProjectJson(page, savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;
    expect(saved.liner?.draft).toBeUndefined();
    expect(saved.liner?.domainDraft).toBeUndefined();
    expect(saved.liner?.roadDesignDocument?.ldistCapability?.state).toBe("supported");
    const geometryDraft = readGeometryDomainDraft(saved);
    const ldistJobs = (geometryDraft?.ldistJobs ?? []) as LdistJobSaved[];
    expect(ldistJobs.some((job) => job.id === jobId)).toBe(true);
    const persisted = ldistJobs.find((job) => job.id === jobId);
    expect(persisted?.distanceMode).toBe("mode_b");
    expect(persisted?.referenceLineId).toBe(leftLineId);
    expect(persisted).not.toHaveProperty("distanceM");
    expect(persisted).not.toHaveProperty("overhangM");
    expect(geometryDraft).not.toHaveProperty("ldistResults");
    expect(saved.liner?.roadDesignDocument).not.toHaveProperty("ldistResults");

    const roundTripPath = join(OUT_DIR, "project-roundtrip.json");
    writeFileSync(roundTripPath, `${JSON.stringify(saved, null, 2)}\n`);
    await page.getByLabel("開く", { exact: true }).setInputFiles(roundTripPath);
    await page.getByRole("button", { name: "ログ" }).click();
    await expect(page.getByText("project-roundtrip.json opened.")).toBeVisible();

    await page.locator("[data-testid=open-liner-list]").click();
    await page.locator("[data-testid=open-liner-setup]").click();
    await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible({ timeout: 15000 });
    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await expect(page.locator(`[data-testid=ldist-job-row-${jobId}]`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-testid=ldist-result-row]").first()).toBeVisible({ timeout: 15000 });
  });

  test("fail-closed diagnostics for invalid LDIST references", async ({ page }) => {
    test.setTimeout(90000);
    await openLinerSetup(page);
    const { leftLineId, rightLineId } = await ensureDistinctOffsetLines(page);

    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await page.locator("[data-testid=ldist-job-add]").click();
    const jobId = ((await page.locator("[data-testid^=ldist-job-row-]").first().getAttribute("data-testid")) ?? "")
      .replace("ldist-job-row-", "");

    await page.locator(`[data-testid=ldist-pair-from-${jobId}-0]`).selectOption(leftLineId);
    await page.locator(`[data-testid=ldist-pair-to-${jobId}-0]`).selectOption(rightLineId);
    await expect(page.locator("[data-testid=ldist-result-row]").first()).toBeVisible({ timeout: 15000 });

    await page.locator(`[data-testid=ldist-job-distance-mode-${jobId}]`).selectOption("mode_b");
    await page.locator(`[data-testid=ldist-job-reference-line-${jobId}]`).selectOption("");
    await expect(page.locator("[data-testid=ldist-diagnostics-panel]")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-testid=ldist-result-row]")).toHaveCount(0);
  });
});
