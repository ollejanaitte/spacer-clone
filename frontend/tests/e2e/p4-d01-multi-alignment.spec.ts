import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deriveLinerCenterlineId } from "../../src/liner/adapters/linerDomainDraftRoadDesignMapper";

const OUT_DIR = "/tmp/p4-d01-multi-alignment";
const GEOMETRY_EXTENSION_KEY = "spacer.liner/domain-draft-vnext-geometry";
const FIRST_ALIGNMENT_ID = "alignment-1";
const SECOND_ALIGNMENT_ID = "alignment-2";
const MODEL_ID = "liner-p4-d01";

type AlignmentBundle = {
  id: string;
  name?: string;
  enabled?: boolean;
  sortIndex?: number;
  crossSections?: Array<{
    offsetLines?: Array<{ id: string; label?: string }>;
  }>;
};

type SavedProject = {
  liner?: {
    draft?: unknown;
    domainDraft?: unknown;
    roadDesignDocument?: {
      documentKind?: string;
      alignments?: Array<{ label?: string }>;
      extensions?: Record<string, { json?: { domainDraft?: Record<string, unknown> } }>;
    };
    sourceRevision?: string;
  };
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

async function saveProjectJson(page: Page, savedPath: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.locator("button[title='現在のモデルを project.json として保存します。']").click(),
  ]);
  await download.saveAs(savedPath);
}

test.describe("P4-D01 multi-alignment and line management (P4-E2E-01)", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("adds alignments and offset lines, saves, and restores after reload", async ({ page }) => {
    await openLinerSetup(page);
    await page.locator("[data-testid=liner-setup-tab-line]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-line]")).toBeVisible();

    await expect(page.locator("[data-testid=liner-alignment-row-alignment-1]")).toBeVisible();
    await page.locator("[data-testid=liner-alignment-add]").click();
    await expect(page.locator("[data-testid=liner-alignment-row-alignment-2]")).toBeVisible();
    await expect(page.getByTestId("liner-active-alignment-indicator")).toContainText(SECOND_ALIGNMENT_ID);

    await page.locator("[data-testid=liner-line-add]").click();
    const secondAlignmentLineRows = page.locator("[data-testid^=liner-line-row-OL-]");
    await expect(secondAlignmentLineRows).toHaveCount(2);
    const secondAlignmentAddedLineId = await secondAlignmentLineRows.last().getAttribute("data-testid");
    const secondLineId = secondAlignmentAddedLineId?.replace("liner-line-row-", "") ?? "";
    expect(secondLineId.length).toBeGreaterThan(0);
    await page.locator(`[data-testid=liner-line-label-${secondLineId}]`).fill("A2-offset");

    await page.locator(`[data-testid=liner-alignment-select-${FIRST_ALIGNMENT_ID}]`).click();
    await expect(page.getByTestId("liner-active-alignment-indicator")).toContainText(FIRST_ALIGNMENT_ID);

    await page.locator("[data-testid=liner-line-add]").click();
    const firstAlignmentLineRows = page.locator("[data-testid^=liner-line-row-OL-]");
    await expect(firstAlignmentLineRows).toHaveCount(2);
    const firstAlignmentAddedLineId = await firstAlignmentLineRows.last().getAttribute("data-testid");
    const firstLineId = firstAlignmentAddedLineId?.replace("liner-line-row-", "") ?? "";
    expect(firstLineId.length).toBeGreaterThan(0);
    await page.locator(`[data-testid=liner-line-label-${firstLineId}]`).fill("A1-offset");

    await page.locator("[data-testid=open-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro/liner/mapping-review");
    await expect(page.locator("[data-testid=liner-mapping-review-page]")).toBeVisible();
    await page.locator("[data-testid=close-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro");

    const savedPath = join(OUT_DIR, "project.json");
    await saveProjectJson(page, savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;
    expect(saved.liner?.draft).toBeUndefined();
    expect(saved.liner?.domainDraft).toBeUndefined();
    expect(saved.liner?.roadDesignDocument?.documentKind).toBe("road-design");
    expect(saved.liner?.sourceRevision).toMatch(/^[a-f0-9]{64}$/);

    const geometryDraft = readGeometryDomainDraft(saved);
    expect(geometryDraft?.linerModelId).toBe(MODEL_ID);
    const alignments = geometryDraft?.alignments as AlignmentBundle[] | undefined;
    expect(alignments).toHaveLength(2);
    expect(alignments?.map((bundle) => bundle.id)).toEqual([FIRST_ALIGNMENT_ID, SECOND_ALIGNMENT_ID]);
    expect(alignments?.map((bundle) => bundle.sortIndex)).toEqual([0, 1]);
    expect(geometryDraft?.activeAlignmentId).toBe(FIRST_ALIGNMENT_ID);
    expect(geometryDraft?.activeLineId).toBe(deriveLinerCenterlineId(FIRST_ALIGNMENT_ID));

    const firstBundle = alignments?.find((bundle) => bundle.id === FIRST_ALIGNMENT_ID);
    const secondBundle = alignments?.find((bundle) => bundle.id === SECOND_ALIGNMENT_ID);
    expect(firstBundle?.crossSections?.[0]?.offsetLines?.some((line) => line.id === firstLineId)).toBe(true);
    expect(secondBundle?.crossSections?.[0]?.offsetLines?.some((line) => line.id === secondLineId)).toBe(true);

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
    await page.locator("[data-testid=liner-setup-tab-line]").click();

    await expect(page.locator("[data-testid=liner-alignment-row-alignment-1]")).toBeVisible();
    await expect(page.locator("[data-testid=liner-alignment-row-alignment-2]")).toBeVisible();
    await expect(page.getByTestId("liner-active-alignment-indicator")).toContainText(FIRST_ALIGNMENT_ID);
    await expect(page.locator(`[data-testid=liner-line-row-${firstLineId}]`)).toBeVisible();
    await expect(page.locator(`[data-testid=liner-line-label-${firstLineId}]`)).toHaveValue("A1-offset");

    await page.locator(`[data-testid=liner-alignment-select-${SECOND_ALIGNMENT_ID}]`).click();
    await expect(page.getByTestId("liner-active-alignment-indicator")).toContainText(SECOND_ALIGNMENT_ID);
    await expect(page.locator(`[data-testid=liner-line-row-${secondLineId}]`)).toBeVisible();
    await expect(page.locator(`[data-testid=liner-line-label-${secondLineId}]`)).toHaveValue("A2-offset");
  });
});
