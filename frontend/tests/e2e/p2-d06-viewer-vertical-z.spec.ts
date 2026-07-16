import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/p2-d06-viewer-vertical-z";
const GEOMETRY_EXTENSION_KEY = "spacer.liner/domain-draft-vnext-geometry";
const ALIGNMENT_ID = "alignment-p2-d06";
const MODEL_ID = "liner-p2-d06";
const END_NODE_ID = `N_LINER_${MODEL_ID}_010_000`;
const EXPECTED_END_Z = 11;

type SavedProject = {
  nodes?: Array<{ id: string; x?: number; y?: number; z?: number }>;
  liner?: {
    domainDraft?: unknown;
    roadDesignDocument?: {
      documentKind?: string;
      alignments?: Array<{ label?: string }>;
      profiles?: Array<{ label?: string }>;
      extensions?: Record<string, { json?: { domainDraft?: Record<string, unknown> } }>;
    };
    sourceRevision?: string;
  };
};

function readGeometryDomainDraft(saved: SavedProject): Record<string, unknown> | undefined {
  const extension = saved.liner?.roadDesignDocument?.extensions?.[GEOMETRY_EXTENSION_KEY];
  return extension?.json?.domainDraft;
}

async function setupGradedLinerDraft(page: import("@playwright/test").Page) {
  await page.goto("/pro");
  await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible({
    timeout: 60000,
  });

  await page.locator("[data-testid=open-liner-list]").click();
  await page.locator("[data-testid=create-liner]").click();
  await page.locator("[data-testid=liner-launcher-gui]").click();
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible();

  await page.locator("[data-testid=liner-alignment-id]").fill(ALIGNMENT_ID);
  await page.locator("[data-testid=liner-model-id]").fill(MODEL_ID);
  await page.locator("[data-testid=liner-setup-tab-station]").click();
  await page.locator("[data-testid=liner-sample-interval]").fill("50");

  await page.locator("[data-testid=liner-setup-tab-vertical]").click();
  await page.locator("[data-testid=liner-vertical-element-start-elevation-VG-default]").fill("10");
  await page.locator("[data-testid=liner-vertical-element-grade-VG-default]").fill("1");
  await page.locator("[data-testid=liner-vertical-element-grade-VG-default]").blur();
}

test.describe("P2-D06 viewer vertical Z integration", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("opens mapping review with a graded vertical profile and validation-ready viewer handoff", async ({ page }) => {
    await setupGradedLinerDraft(page);

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    await page.locator("[data-testid=open-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro/liner/mapping-review");
    await expect(page.locator("[data-testid=liner-mapping-review-page]")).toBeVisible();
    await expect(page.locator("[data-testid=liner-mapping-no-viewer]")).toHaveCount(0);
    await expect(page.locator("[data-testid=confirm-liner-mapping]")).toBeEnabled();
    await expect(page.locator(".liner-mapping-summary")).toContainText("節点");
    await expect(page.locator(".liner-mapping-summary")).toContainText("部材");
  });

  test("persists merged liner node Z through project.json save and reload", async ({ page }) => {
    test.setTimeout(120000);

    await setupGradedLinerDraft(page);

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    await page.locator("[data-testid=open-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro/liner/mapping-review");
    await expect(page.locator("[data-testid=confirm-liner-mapping]")).toBeEnabled();

    await page.locator("[data-testid=confirm-liner-mapping]").click();
    await expect(page).toHaveURL("/pro/liner");
    await expect(page.locator("[data-testid=liner-list-page]")).toBeVisible();

    await page.locator("[data-testid=close-liner-list]").click();
    await expect(page).toHaveURL("/pro");

    const saveButton = page.getByRole("button", { name: "保存", exact: true });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }),
      saveButton.click(),
    ]);
    await page.getByRole("button", { name: "ログ" }).click();
    await expect(page.getByText("Current model saved to project.json.")).toBeVisible();
    const savedPath = join(OUT_DIR, "project.json");
    await download.saveAs(savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;

    expect(saved.liner?.domainDraft).toBeUndefined();
    expect(saved.liner?.roadDesignDocument?.documentKind).toBe("road-design");
    expect(saved.liner?.roadDesignDocument?.alignments?.[0]?.label).toBe(ALIGNMENT_ID);
    expect(saved.liner?.roadDesignDocument?.profiles?.[0]?.label).toBe("VA-alignment-p2-d06");
    expect(saved.liner?.sourceRevision).toMatch(/^[a-f0-9]{64}$/);

    const geometryDraft = readGeometryDomainDraft(saved);
    expect(geometryDraft?.linerModelId).toBe(MODEL_ID);
    const activeBundle = (geometryDraft?.alignments as Array<{
      id: string;
      verticalAlignment?: { elements?: Array<{ startElevation?: number; grade?: number }> };
    }> | undefined)?.find((bundle) => bundle.id === ALIGNMENT_ID);
    expect(activeBundle?.id).toBe(ALIGNMENT_ID);
    expect(activeBundle?.verticalAlignment?.elements?.[0]?.startElevation).toBe(10);
    expect(activeBundle?.verticalAlignment?.elements?.[0]?.grade).toBeCloseTo(0.01, 5);

    const endNode = saved.nodes?.find((node) => node.id === END_NODE_ID);
    expect(endNode?.x).toBeCloseTo(100, 3);
    expect(endNode?.z).toBeCloseTo(EXPECTED_END_Z, 3);

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

    await expect(page.locator("[data-testid=liner-alignment-id]")).toHaveValue(ALIGNMENT_ID);
    await expect(page.locator("[data-testid=liner-model-id]")).toHaveValue(MODEL_ID);
    await page.locator("[data-testid=liner-setup-tab-vertical]").click();
    await expect(page.locator("[data-testid=liner-vertical-element-start-elevation-VG-default]")).toHaveValue("10");
    await expect(page.locator("[data-testid=liner-vertical-element-grade-VG-default]")).toHaveValue("1");

    await page.locator("[data-testid=liner-setup-tab-height]").click();
    await expect(page.locator("[data-testid=plan-elevation-table]")).toBeVisible();
    const endElevationRow = page.locator("[data-testid=plan-elevation-row-100]");
    await expect(endElevationRow).toBeVisible();
    await expect(endElevationRow.locator("td").nth(2)).toHaveText(String(EXPECTED_END_Z.toFixed(3)));

    await page.locator("[data-testid=open-liner-preview]").click();
    await expect(page).toHaveURL("/pro/liner/preview");
    await page.locator("[data-testid=open-liner-mapping-review]").click();
    await expect(page).toHaveURL("/pro/liner/mapping-review");
    await expect(page.locator("[data-testid=liner-mapping-no-viewer]")).toHaveCount(0);
    await expect(page.locator("[data-testid=confirm-liner-mapping]")).toBeEnabled();
    await expect(page.locator(".liner-mapping-summary")).toContainText("節点");
  });
});
