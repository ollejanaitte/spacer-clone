import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/p4-d04-hoso";
const GEOMETRY_EXTENSION_KEY = "spacer.liner/domain-draft-vnext-geometry";
const MODEL_ID = "liner-p4-d04";

type SavedProject = {
  liner?: {
    draft?: unknown;
    domainDraft?: unknown;
    roadDesignDocument?: {
      documentKind?: string;
      hosoCapability?: { state?: string };
      extensions?: Record<string, { json?: { domainDraft?: Record<string, unknown> } }>;
    };
  };
};

type HosoDefinitionSaved = {
  id?: string;
  family?: string;
  variant?: string;
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

test.describe("P4-D04 HOSO utilities smoke", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("HOSO editor visible and definitions persist in geometry extension", async ({ page }) => {
    test.setTimeout(120000);
    await openLinerSetup(page);

    await page.locator("[data-testid=liner-setup-tab-utilities]").click();
    await expect(page.locator("[data-testid=liner-setup-tabpanel-utilities]")).toBeVisible();
    await expect(page.locator("[data-testid=hoso-definition-editor]")).toBeVisible();

    await page.locator("[data-testid=hoso-definition-add]").click();
    const definitionRow = page.locator("[data-testid^=hoso-definition-row-]").first();
    await expect(definitionRow).toBeVisible({ timeout: 10000 });
    const definitionId = ((await definitionRow.getAttribute("data-testid")) ?? "").replace(
      "hoso-definition-row-",
      "",
    );
    expect(definitionId.length).toBeGreaterThan(0);

    const savedPath = join(OUT_DIR, "project.json");
    await saveProjectJson(page, savedPath);
    const saved = JSON.parse(readFileSync(savedPath, "utf8")) as SavedProject;
    expect(saved.liner?.draft).toBeUndefined();
    expect(saved.liner?.domainDraft).toBeUndefined();
    expect(saved.liner?.roadDesignDocument?.hosoCapability?.state).toBe("supported");

    const geometryDraft = readGeometryDomainDraft(saved);
    const hosoDefinitions = (geometryDraft?.hosoDefinitions ?? []) as HosoDefinitionSaved[];
    expect(hosoDefinitions.some((definition) => definition.id === definitionId)).toBe(true);
    expect(geometryDraft).not.toHaveProperty("hosoResults");
    expect(saved.liner?.roadDesignDocument).not.toHaveProperty("hosoResults");
  });
});
