import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/p4-d08-roundtrip";
const GEOMETRY_EXTENSION_KEY = "spacer.liner/domain-draft-vnext-geometry";
const MODEL_ID = "liner-p4-d08";

type SavedProject = {
  drawingDocument?: unknown;
  liner?: {
    draft?: unknown;
    domainDraft?: unknown;
    drawingDocument?: unknown;
    roadDesignDocument?: {
      documentKind?: string;
      haunchCapability?: { state?: string };
      hosoCapability?: { state?: string };
      extensions?: Record<string, { json?: { domainDraft?: Record<string, unknown> } }>;
    };
    sourceRevision?: string;
  };
};

type DefinitionSaved = {
  id?: string;
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

async function saveProjectFromFormalDrawing(page: Page, savedPath: string): Promise<SavedProject> {
  await page.locator("[data-testid=formal-drawing-close]").click();
  await expect(page.getByRole("heading", { name: "5-Span Continuous Viaduct (Plan A)" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.locator("button[title='現在のモデルを project.json として保存します。']").click(),
  ]);
  await download.saveAs(savedPath);
  return JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;
}

async function saveProjectJson(page: Page, savedPath: string): Promise<SavedProject> {
  await navigateToProForSave(page);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.locator("button[title='現在のモデルを project.json として保存します。']").click(),
  ]);
  await download.saveAs(savedPath);
  return JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;
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
  await expect(page.locator("[data-testid=liner-edit-page]")).toBeVisible({ timeout: 15000 });
}

async function openFormalDrawingWorkspace(page: Page) {
  await page.locator("[data-testid=open-liner-drawings]").click();
  await expect(page.locator("[data-testid=liner-formal-workspace-page]")).toBeVisible({ timeout: 30000 });
}

async function assertFormalDrawingRoutes(page: Page) {
  await expect(page.locator("[data-testid=formal-drawing-page-indicator]")).toContainText("1/3");
  await expect(page.locator("[data-testid=formal-drawing-preview-document]")).toBeVisible();

  await page.getByRole("tab", { name: "縦断線形図" }).click();
  await expect(page.locator("[data-testid=drawing-sheet-profile-sheet]")).toBeVisible();
  await expect(
    page.locator("[data-testid=drawing-sheet-profile-sheet]").getByText("地盤データ未設定").first(),
  ).toBeVisible();

  await page.getByRole("tab", { name: "横断図" }).click();
  await expect(page.locator("[data-testid^=drawing-sheet-cross]")).toBeVisible();

  await page.getByRole("tab", { name: "平面線形図" }).click();
}

test.describe("P4-D08 round-trip verification", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("P4-E2E-03: HAUNCH and HOSO definitions persist and reload in utilities tab", async ({ page }) => {
    test.setTimeout(180000);
    await openLinerSetup(page);

    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-utilities]")).toBeVisible();

    await page.locator("[data-testid=haunch-definition-add]").click();
    const haunchRow = page.locator("[data-testid^=haunch-definition-row-]").first();
    await expect(haunchRow).toBeVisible({ timeout: 10000 });
    const haunchId = ((await haunchRow.getAttribute("data-testid")) ?? "").replace("haunch-definition-row-", "");
    expect(haunchId.length).toBeGreaterThan(0);

    await page.locator("[data-testid=hoso-definition-add]").click();
    const hosoRow = page.locator("[data-testid^=hoso-definition-row-]").first();
    await expect(hosoRow).toBeVisible({ timeout: 10000 });
    const hosoId = ((await hosoRow.getAttribute("data-testid")) ?? "").replace("hoso-definition-row-", "");
    expect(hosoId.length).toBeGreaterThan(0);

    const savedPath = join(OUT_DIR, "haunch-hoso-project.json");
    const saved = await saveProjectJson(page, savedPath);
    expect(saved.liner?.draft).toBeUndefined();
    expect(saved.liner?.domainDraft).toBeUndefined();
    expect(saved.liner?.roadDesignDocument?.haunchCapability?.state).toBe("supported");
    expect(saved.liner?.roadDesignDocument?.hosoCapability?.state).toBe("supported");

    const geometryDraft = readGeometryDomainDraft(saved);
    const haunchDefinitions = (geometryDraft?.haunchDefinitions ?? []) as DefinitionSaved[];
    const hosoDefinitions = (geometryDraft?.hosoDefinitions ?? []) as DefinitionSaved[];
    expect(haunchDefinitions.some((definition) => definition.id === haunchId)).toBe(true);
    expect(hosoDefinitions.some((definition) => definition.id === hosoId)).toBe(true);

    await reloadProject(page, saved);
    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await expect(page.locator(`[data-testid=haunch-definition-row-${haunchId}]`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(`[data-testid=hoso-definition-row-${hosoId}]`)).toBeVisible({
      timeout: 15000,
    });
  });

  test("P4-E2E-04: formal drawing regenerates after project reload", async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await openLinerSetup(page);

    await openFormalDrawingWorkspace(page);
    const crossSectionStation = page.getByLabel("横断図表示測点");
    await expect(crossSectionStation).toBeVisible();
    await crossSectionStation.selectOption({ index: 3 });
    const selectedValue = Number(await crossSectionStation.inputValue());
    expect(selectedValue).toBeGreaterThan(0);
    await page.locator("[data-testid=formal-plan-type-centerline-only]").check();
    await assertFormalDrawingRoutes(page);

    const savedPath = join(OUT_DIR, "formal-drawing-project.json");
    const saved = await saveProjectFromFormalDrawing(page, savedPath);
    expect(saved.drawingDocument).toBeUndefined();
    expect(saved.liner?.drawingDocument).toBeUndefined();
    expect(saved.liner?.roadDesignDocument?.documentKind).toBe("road-design");

    const geometryDraft = readGeometryDomainDraft(saved);
    expect(geometryDraft?.linerModelId).toBe(MODEL_ID);
    expect(geometryDraft?.selectedCrossSectionStation).toBeGreaterThan(0);

    await reloadProject(page, saved);
    await expect(page.locator("[data-testid=liner-model-id]")).toHaveValue(MODEL_ID);

    await openFormalDrawingWorkspace(page);
    await expect(crossSectionStation).toHaveValue(String(selectedValue));
    await assertFormalDrawingRoutes(page);
    await expect(page.locator("[data-testid=formal-drawing-road-export-csv]")).toBeVisible();
  });
});
