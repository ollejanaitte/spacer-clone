import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/p3-f03-rdd-bridge-drawing-persistence";
const GEOMETRY_EXTENSION_KEY = "spacer.liner/domain-draft-vnext-geometry";
const ALIGNMENT_ID = "alignment-p3-f03";
const MODEL_ID = "liner-p3-f03";

type SavedProject = {
  drawingDocument?: unknown;
  liner?: {
    draft?: unknown;
    domainDraft?: unknown;
    drawingDocument?: unknown;
    roadDesignDocument?: {
      documentKind?: string;
      alignments?: Array<{ label?: string }>;
      bridges?: Array<{ entityId?: string; label?: string }>;
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

  await page.locator("[data-testid=liner-alignment-id]").fill(ALIGNMENT_ID);
  await page.locator("[data-testid=liner-model-id]").fill(MODEL_ID);
}

async function editBridgeLayout(page: Page) {
  await page.locator("[data-testid=liner-setup-tab-review]").click();
  await expect(page.locator("[data-testid=liner-setup-tabpanel-review]")).toBeVisible();

  await page.locator("[data-testid=add-bridge-pier]").click();
  await page.locator("[data-testid=bridge-pier-station-P1]").fill("20");
  await page.locator("[data-testid=bridge-pier-offset-P1]").fill("0.5");

  await page.locator("[data-testid=add-bridge-pier]").click();
  await page.locator("[data-testid=bridge-pier-station-P2]").fill("80");

  await page.locator("[data-testid=add-bridge-span]").click();
  await page.locator("[data-testid=bridge-span-start-SP1]").fill("20");
  await page.locator("[data-testid=bridge-span-end-SP1]").fill("80");
  await page.locator("[data-testid=bridge-span-pier-start-SP1]").selectOption("P1");
  await page.locator("[data-testid=bridge-span-pier-end-SP1]").selectOption("P2");

  await expect(page.locator("[data-testid=bridge-pier-row-P1]")).toBeVisible();
  await expect(page.locator("[data-testid=bridge-pier-row-P2]")).toBeVisible();
  await expect(page.locator("[data-testid=bridge-span-row-SP1]")).toBeVisible();
}

async function openFormalDrawingWorkspace(page: Page) {
  await page.locator("[data-testid=open-liner-drawings]").click();
  await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });
}

async function editFormalDrawingSettings(page: Page): Promise<number> {
  const crossSectionStation = page.getByLabel("横断図表示測点");
  await expect(crossSectionStation).toBeVisible();
  await crossSectionStation.selectOption({ index: 3 });
  const selectedValue = Number(await crossSectionStation.inputValue());
  expect(selectedValue).toBeGreaterThan(0);

  await page.locator("[data-testid=formal-plan-type-centerline-only]").check();
  await expect(page.locator("[data-testid=drawing-sheet-plan-sheet]")).toBeVisible();
  return selectedValue;
}

async function assertFormalDrawingRoutes(page: Page) {
  await expect(page.locator("[data-testid=formal-drawing-page-indicator]")).toContainText("1/3");
  await expect(page.locator("[data-testid=formal-drawing-scale-indicator]")).toBeVisible();
  await expect(page.locator("[data-testid=formal-drawing-preview-document]")).toBeVisible();
  await expect(page.locator("[data-testid=formal-drawing-print-active-sheet]")).toBeEnabled();
  await expect(page.locator("[data-testid=formal-drawing-export-plan-dxf]")).toBeEnabled();

  await page.getByRole("tab", { name: "縦断線形図" }).click();
  await expect(page.locator("[data-testid=drawing-sheet-profile-sheet]")).toBeVisible();
  await expect(page.locator("[data-testid=formal-drawing-page-indicator]")).toContainText("2/3");
  await expect(
    page.locator("[data-testid=drawing-sheet-profile-sheet]").getByText("地盤データ未設定").first(),
  ).toBeVisible();
  await expect(page.locator("[data-testid=formal-drawing-print-active-sheet]")).toBeEnabled();
  await expect(page.locator("[data-testid=formal-drawing-export-profile-dxf]")).toBeEnabled();

  await page.getByRole("tab", { name: "横断図" }).click();
  await expect(page.locator("[data-testid^=drawing-sheet-cross]")).toBeVisible();
  await expect(page.locator("[data-testid=formal-drawing-page-indicator]")).toContainText("3/3");
  await expect(page.locator("[data-testid=formal-drawing-print-active-sheet]")).toBeEnabled();
  await expect(page.locator("[data-testid=formal-drawing-export-cross-section-dxf]")).toBeEnabled();

  await page.getByRole("tab", { name: "平面線形図" }).click();
}

async function saveProjectJson(page: Page): Promise<SavedProject> {
  await page.locator("[data-testid=formal-drawing-close]").click();
  await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    page.locator("button[title='現在のモデルを project.json として保存します。']").click(),
  ]);
  const savedPath = join(OUT_DIR, "project.json");
  await download.saveAs(savedPath);
  return JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;
}

function assertPersistedProjectShape(saved: SavedProject) {
  expect(saved.drawingDocument).toBeUndefined();
  expect(saved.liner?.draft).toBeUndefined();
  expect(saved.liner?.domainDraft).toBeUndefined();
  expect(saved.liner?.drawingDocument).toBeUndefined();
  expect(saved.liner?.roadDesignDocument?.documentKind).toBe("road-design");
  expect(saved.liner?.roadDesignDocument?.alignments?.[0]?.label).toBe(ALIGNMENT_ID);
  expect(saved.liner?.roadDesignDocument?.bridges).toEqual([
    expect.objectContaining({
      label: "SP1",
    }),
  ]);
  expect(saved.liner?.sourceRevision).toMatch(/^[a-f0-9]{64}$/);

  const geometryDraft = readGeometryDomainDraft(saved);
  expect(geometryDraft?.linerModelId).toBe(MODEL_ID);
  expect(geometryDraft?.alignment).toMatchObject({ id: ALIGNMENT_ID });
  expect(geometryDraft?.selectedCrossSectionStation).toBeGreaterThan(0);

  const spans = geometryDraft?.spans as Array<Record<string, unknown>> | undefined;
  const piers = geometryDraft?.piers as Array<Record<string, unknown>> | undefined;
  expect(spans).toEqual([
    expect.objectContaining({
      id: "SP1",
      startPhysicalDistance: 20,
      endPhysicalDistance: 80,
      pierIdStart: "P1",
      pierIdEnd: "P2",
    }),
  ]);
  expect(piers).toEqual([
    expect.objectContaining({
      id: "P1",
      physicalDistance: 20,
      bearingOffsets: [{ transverseIndex: 0, offset: 0.5 }],
    }),
    expect.objectContaining({
      id: "P2",
      physicalDistance: 80,
    }),
  ]);
}

async function reloadProject(page: Page, saved: SavedProject) {
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
}

async function assertReloadedBridgeLayout(page: Page) {
  await page.locator("[data-testid=liner-setup-tab-review]").click();
  await expect(page.locator("[data-testid=bridge-pier-row-P1]")).toBeVisible();
  await expect(page.locator("[data-testid=bridge-pier-row-P2]")).toBeVisible();
  await expect(page.locator("[data-testid=bridge-span-row-SP1]")).toBeVisible();
  await expect(page.locator("[data-testid=bridge-pier-station-P1]")).toHaveValue("20");
  await expect(page.locator("[data-testid=bridge-pier-offset-P1]")).toHaveValue("0.5");
  await expect(page.locator("[data-testid=bridge-pier-station-P2]")).toHaveValue("80");
  await expect(page.locator("[data-testid=bridge-span-start-SP1]")).toHaveValue("20");
  await expect(page.locator("[data-testid=bridge-span-end-SP1]")).toHaveValue("80");
  await expect(page.locator("[data-testid=bridge-span-pier-start-SP1]")).toHaveValue("P1");
  await expect(page.locator("[data-testid=bridge-span-pier-end-SP1]")).toHaveValue("P2");
}

test.describe("P3-F03 RoadDesignDocument bridge and drawing persistence", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("persists bridge layout and formal drawing settings through save/reload and regenerates DrawingDocument", async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1366, height: 768 });

    await openLinerSetup(page);
    await editBridgeLayout(page);
    await openFormalDrawingWorkspace(page);
    const selectedCrossSectionStation = await editFormalDrawingSettings(page);
    await assertFormalDrawingRoutes(page);

    const saved = await saveProjectJson(page);
    assertPersistedProjectShape(saved);

    await reloadProject(page, saved);
    await expect(page.locator("[data-testid=liner-alignment-id]")).toHaveValue(ALIGNMENT_ID);
    await expect(page.locator("[data-testid=liner-model-id]")).toHaveValue(MODEL_ID);
    await assertReloadedBridgeLayout(page);

    await openFormalDrawingWorkspace(page);
    const crossSectionStation = page.getByLabel("横断図表示測点");
    await expect(crossSectionStation).toHaveValue(String(selectedCrossSectionStation));
    await assertFormalDrawingRoutes(page);

    await page.getByRole("tab", { name: "縦断線形図" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.locator("[data-testid=formal-drawing-export-profile-dxf]").click(),
    ]);
    const dxfPath = join(OUT_DIR, "profile-after-reload.dxf");
    await download.saveAs(dxfPath);
    const dxfContent = readFileSync(dxfPath, "utf8");
    expect(dxfContent.startsWith("0\nSECTION")).toBe(true);
    expect(dxfContent.trimEnd().endsWith("0\nEOF")).toBe(true);
    expect(dxfContent).not.toMatch(/NaN|Infinity/);
  });
});
