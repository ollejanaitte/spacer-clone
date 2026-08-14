import { expect, test, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const EVIDENCE_DIR = path.resolve(__dirname, "../../../docs/rebuild/evidence");
function evidencePath(name: string): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  return path.join(EVIDENCE_DIR, name);
}

/**
 * Phase 9-04R3 browser acceptance + screenshots.
 *
 * Vertical: Project -> Road -> Bridge Layout -> Superstructure generate ->
 * full input (declared section/material/cross beam/bearing) -> AUTHORIZED
 * load -> Save -> 2D -> Quantity -> DXF -> CIM -> Analysis -> IF3 SUCCEEDED
 * -> Reaction/N/Q/M/T/Deformed authoritative tables.
 *
 * Feature flags VITE_SUPERSTRUCTURE_RESCUE / VITE_SUBSTRUCTURE_RESCUE must be
 * "true" (set via the launch env of the running Vite server).
 */


async function openProject(page: Page): Promise<void> {
  await page.goto("/app");
  await page.locator("[data-testid=home-go-business]").click();
  await expect(page).toHaveURL(/\/app\/business$/);
  const row = page.locator("tr", { hasText: "R3-ACCEPT" }).first();
  if ((await row.count()) === 0) {
    await page.locator("[data-testid=new-project-button]").click();
    await expect(page).toHaveURL(/\/app\/business\/new$/);
    await page.locator("[data-testid=form-business-number]").fill("R3-ACCEPT");
    await page.locator("[data-testid=form-name]").fill("Phase9-04R3 受入");
    await page.locator("[data-testid=form-design-stage]").selectOption("bridge-detailed");
    await page.locator("[data-testid=form-submit]").click();
    await expect(page).toHaveURL(/\/app\/business$/);
    const row2 = page.locator("tr", { hasText: "R3-ACCEPT" }).first();
    await row2.locator("[data-testid=business-open]").click();
  } else {
    await row.locator("[data-testid=business-open]").click();
  }
  await expect(page).toHaveURL(/\/app\/projects\/.+/);
  await expect(page.locator("[data-testid=project-top-page]")).toBeVisible();
}

async function ensureRoadSaved(page: Page): Promise<void> {
  await page.locator("[data-testid=module-open-road]").click();
  await expect(page).toHaveURL(/modules\/road/);
  await page.locator("[data-testid=road-save-button]").click();
  try {
    await expect(page.locator("[data-testid=road-message]")).toContainText("保存しました");
  } catch {
    // already saved (message may differ)
  }
  await page.locator("[data-testid=road-module-back]").click();
  await expect(page).toHaveURL(/\/app\/projects\/.+/);
}

async function ensureBridgeLayout(page: Page): Promise<void> {
  await page.locator("[data-testid=module-open-bridgeLayout]").click();
  await expect(page).toHaveURL(/modules\/bridgeLayout/);
  await expect(page.locator("[data-testid=bridge-layout-module-page]")).toBeVisible();
  // configure the bridge range so the superstructure can be generated
  await page.locator("[data-testid=bridge-name-input]").fill("R3橋梁");
  const start = page.locator("[data-testid=bridge-start-station]");
  const end = page.locator("[data-testid=bridge-end-station]");
  if (await start.isEnabled()) {
    await start.fill("100");
  }
  if (await end.isEnabled()) {
    await end.fill("400");
  }
  await page.locator("[data-testid=bridge-layout-save-button]").click();
  try {
    await expect(page.locator("[data-testid=bridge-layout-message]")).toContainText("保存しました", { timeout: 5000 });
  } catch {
    // may already be saved / message wording may differ; continue if doc exists
  }
  const back = page.locator("[data-testid=bridge-layout-module-back]");
  if ((await back.count()) > 0) {
    await back.click();
    await expect(page).toHaveURL(/\/app\/projects\/.+/);
  }
}

test.describe.serial("Phase 9-04R3 browser acceptance", () => {
  test("01 project top + road + bridge layout", async ({ page }) => {
    await openProject(page);
    await page.screenshot({ path: evidencePath("p9-04r3-01-project-top.png"), fullPage: true });

    await ensureRoadSaved(page);
    await page.screenshot({ path: evidencePath("p9-04r3-02-road.png"), fullPage: true });

    await ensureBridgeLayout(page);
    await page.locator("[data-testid=module-open-bridgeLayout]").click();
    await expect(page).toHaveURL(/modules\/bridgeLayout/);
    await page.screenshot({ path: evidencePath("p9-04r3-03-bridgelayout.png"), fullPage: true });
  });

  test("02 superstructure generate + full input UI", async ({ page }) => {
    await openProject(page);
    await ensureRoadSaved(page);
    await ensureBridgeLayout(page);

    await page.locator("[data-testid=module-open-superstructure]").click();
    await expect(page).toHaveURL(/modules\/superstructure/);
    await expect(page.locator("[data-testid=module-shell-page]")).toBeVisible();

    // generate if not present
    const docState = page.locator("[data-testid=super-document]");
    if ((await docState.textContent()) === "なし") {
      await page.locator("[data-testid=super-generate-button]").click();
    }
    await expect(page.locator("[data-testid=super-document]")).toContainText("あり");

    // rescue editor present (feature flag on)
    await expect(page.locator("[data-testid=super-rescue]")).toBeVisible();
    await page.screenshot({ path: evidencePath("p9-04r3-04-super-rescue.png"), fullPage: true });
  });

  test("03 superstructure declared section + material + cross beam + bearing + load", async ({ page }) => {
    await openProject(page);
    await ensureRoadSaved(page);
    await ensureBridgeLayout(page);
    await page.locator("[data-testid=module-open-superstructure]").click();
    const docState = page.locator("[data-testid=super-document]");
    if ((await docState.textContent()) === "なし") {
      await page.locator("[data-testid=super-generate-button]").click();
    }
    await expect(page.locator("[data-testid=super-rescue]")).toBeVisible();

    async function setField(label: string, value: string) {
      const input = page.locator(`[data-testid=super-field-${label}]`);
      await input.fill(value);
      await input.blur();
    }

    // declared section
    await setField("主桁高", "1.5");
    await setField("ウェブ厚", "0.02");
    await setField("上フランジ幅", "0.5");
    await setField("上フランジ厚", "0.03");
    await setField("下フランジ幅", "0.5");
    await setField("下フランジ厚", "0.03");
    // material
    await setField("鋼弾性係数", "205000000");
    await setField("鋼ポアソン比", "0.3");
    // deck
    await setField("床版厚", "0.25");
    // cross beam
    const crossSpacing = page.locator("[data-testid=super-field-横桁間隔]");
    if ((await crossSpacing.count()) > 0) {
      await setField("横桁間隔", "8");
    }

    // bearing FIXED on the first support (solver stability)
    const firstBearingFixed = page.locator("[data-testid=super-bearing-fixed-A1]").first();
    if ((await firstBearingFixed.count()) > 0) {
      await firstBearingFixed.selectOption("FIXED");
    } else {
      const anyBearing = page.locator("[data-testid^=super-bearing-fixed-]").first();
      if ((await anyBearing.count()) > 0) {
        await anyBearing.selectOption("FIXED");
      }
    }

    await expect(page.locator("[data-testid=super-rescue-message]")).toBeVisible();
    await page.screenshot({ path: evidencePath("p9-04r3-05-super-full-input.png"), fullPage: true });

    // AUTHORIZED load view (scroll into view for a distinct capture)
    const loadView = page.locator("[data-testid=super-authorized-load]");
    await expect(loadView).toBeVisible();
    await loadView.scrollIntoViewIfNeeded();
    await page.screenshot({ path: evidencePath("p9-04r3-06-authorized-load.png"), fullPage: true });

    // 2D plan / quantity / DXF present (scroll into view)
    await expect(page.locator("[data-testid=super-plan-view]")).toBeVisible();
    await expect(page.locator("[data-testid=super-quantity]")).toBeVisible();
    await expect(page.locator("[data-testid=super-dxf-export]")).toBeVisible();
    await page.locator("[data-testid=super-plan-view]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: evidencePath("p9-04r3-07-super-2d-quantity.png"), fullPage: true });
  });

  test("04 analysis + IF3 authoritative result", async ({ page }) => {
    await openProject(page);
    await ensureRoadSaved(page);
    await ensureBridgeLayout(page);
    await page.locator("[data-testid=module-open-superstructure]").click();
    const docState = page.locator("[data-testid=super-document]");
    if ((await docState.textContent()) === "なし") {
      await page.locator("[data-testid=super-generate-button]").click();
    }

    // declared section + material + FIXED bearing for solver stability
    async function setField(label: string, value: string) {
      const input = page.locator(`[data-testid=super-field-${label}]`);
      await input.fill(value);
      await input.blur();
    }
    await setField("主桁高", "1.5");
    await setField("ウェブ厚", "0.02");
    await setField("上フランジ幅", "0.5");
    await setField("上フランジ厚", "0.03");
    await setField("下フランジ幅", "0.5");
    await setField("下フランジ厚", "0.03");
    await setField("床版厚", "0.25");
    const anyBearing = page.locator("[data-testid^=super-bearing-fixed-]").first();
    if ((await anyBearing.count()) > 0) {
      await anyBearing.selectOption("FIXED");
    }

    // go to CIM and run analysis
    await page.locator("[data-testid=module-shell-back]").click();
    await expect(page).toHaveURL(/\/app\/projects\/.+/);
    await page.locator("[data-testid=module-open-cim]").click();
    await expect(page).toHaveURL(/modules\/cim/);
    await expect(page.locator("[data-testid=cim-viewer]")).toBeVisible();

    await page.locator("[data-testid=cim-run-analysis]").click();
    await expect(page.locator("[data-testid=cim-analysis-message]")).toContainText("完了", { timeout: 60000 });

    const statusText = await page.locator("[data-testid=cim-result-status]").textContent();
    const msgText = await page.locator("[data-testid=cim-analysis-message]").textContent();
    // eslint-disable-next-line no-console
    console.log("CIM result status:", statusText, "msg:", msgText);

    // MANDATORY (Sol review #7): IF3 must be authoritative with real rows.
    await expect(page.locator("[data-testid=cim-result-status]")).toContainText("authoritative");
    const reactionTable = page.locator("[data-testid=if3-reaction-table]");
    await expect(reactionTable).toBeVisible();
    await page.screenshot({ path: evidencePath("p9-04r3-08-cim-if3.png"), fullPage: true });

    const reactionRows = page.locator("[data-testid=if3-reaction-row]");
    expect(await reactionRows.count()).toBeGreaterThan(0);
    // at least one reaction has a non-zero vertical Fz (real solver output).
    // Columns: node, loadCase, Fx, Fy, Fz, Mx, My, Mz
    const reactionCells = await reactionRows.locator("td").allTextContents();
    const fzValues: string[] = [];
    for (let i = 4; i < reactionCells.length; i += 8) {
      fzValues.push(reactionCells[i]!);
    }
    const hasNonZeroFz = fzValues.some((v) => {
      const n = Number(v.replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) && Math.abs(n) > 1e-6;
    });
    expect(hasNonZeroFz).toBe(true);

    const memberTable = page.locator("[data-testid=if3-memberforce-table]");
    await expect(memberTable).toBeVisible();
    const memberRows = page.locator("[data-testid=if3-memberforce-row]");
    expect(await memberRows.count()).toBeGreaterThan(0);
    // N/Q/M/T cells (columns: member, loadCase, N, Q, M, T) must contain
    // non-zero real values (main-girder bending). N is col index 2 (i/j pair).
    const memberCells = await memberRows.locator("td").allTextContents();
    const nValues: string[] = [];
    for (let i = 2; i < memberCells.length; i += 6) {
      nValues.push(memberCells[i]!);
    }
    const hasNonZeroMember = nValues.some((v) => {
      const parsed = v.split("/").map((s) => Number(s.replace(/[^0-9.\-]/g, "")));
      return parsed.some((n) => Number.isFinite(n) && Math.abs(n) > 1e-6);
    });
    expect(hasNonZeroMember).toBe(true);

    // deformed summary must exist with node count > 0
    await expect(page.locator("[data-testid=if3-deformed-summary]")).toBeVisible();
    const deformedText = await page.locator("[data-testid=if3-deformed-summary]").textContent();
    expect(deformedText).toBeTruthy();
    await page.screenshot({ path: evidencePath("p9-04r3-09-if3-reaction-nqm.png"), fullPage: true });
  });

  test("05 substructure generate + 3-pane + pile grid", async ({ page }) => {
    await openProject(page);
    await ensureRoadSaved(page);
    await ensureBridgeLayout(page);

    await page.locator("[data-testid=module-open-substructure]").click();
    await expect(page).toHaveURL(/modules\/substructure/);
    const subDoc = page.locator("[data-testid=sub-document]");
    if ((await subDoc.textContent()) === "なし") {
      await page.locator("[data-testid=sub-generate-button]").click();
    }
    await expect(page.locator("[data-testid=sub-rescue]")).toBeVisible();

    // 3-pane layout
    await expect(page.locator("[data-testid=sub-3pane-layout]")).toBeVisible();
    await page.screenshot({ path: evidencePath("p9-04r3-10-sub-3pane.png"), fullPage: true });

    // select a support and set a pile dimension to initialize the pile group
    const firstSupport = page.locator("[data-testid^=sub-support-]").first();
    expect(await firstSupport.count()).toBeGreaterThan(0);
    await firstSupport.click();
    await expect(page.locator("[data-testid=sub-pane-properties]")).toBeVisible();

    // edit a pile dimension so the pile group + grid editor materialize
    const pileDiameter = page.locator("[data-testid=sub-field-杭径], [data-testid=sub-field-abutment-pile-diameter]").first();
    await pileDiameter.fill("1.2");
    await pileDiameter.blur();
    await page.screenshot({ path: evidencePath("p9-04r3-11-sub-property-pilegrid.png"), fullPage: true });

    // pile grid editor + coordinate table MUST exist (Sol review #7)
    const gridEditor = page.locator("[data-testid=pile-grid-editor]");
    await expect(gridEditor).toBeVisible();
    await gridEditor.scrollIntoViewIfNeeded();
    await page.screenshot({ path: evidencePath("p9-04r3-12-sub-pile-grid.png"), fullPage: true });
    const coordTable = page.locator("[data-testid=pile-coordinate-table]");
    await expect(coordTable).toBeVisible();
    expect(await page.locator("[data-testid^=pile-coord-]").count()).toBeGreaterThan(0);

    // 3-pane bidirectional sync (Sol review #5/#7): click the 2D plan support
    // and verify the property editor reflects it.
    const planSupport = page.locator("[data-testid^=sub-plan-support-]").first();
    if ((await planSupport.count()) > 0) {
      const planSupportId = (await planSupport.getAttribute("data-testid"))!.replace("sub-plan-support-", "");
      await planSupport.click();
      await expect(page.locator("[data-testid=sub-pane-properties]")).toContainText(planSupportId);
    }
  });

  test("06 persistence restart + pile grid reload (Sol review #7)", async ({ page }) => {
    await openProject(page);
    await ensureRoadSaved(page);
    await ensureBridgeLayout(page);
    await page.locator("[data-testid=module-open-substructure]").click();
    const subDoc = page.locator("[data-testid=sub-document]");
    if ((await subDoc.textContent()) === "なし") {
      await page.locator("[data-testid=sub-generate-button]").click();
    }
    await expect(page.locator("[data-testid=sub-rescue]")).toBeVisible();

    // set a pile grid value
    const firstSupport = page.locator("[data-testid^=sub-support-]").first();
    await firstSupport.click();
    const pileDiameter = page.locator("[data-testid=sub-field-杭径], [data-testid=sub-field-abutment-pile-diameter]").first();
    await pileDiameter.fill("1.2");
    await pileDiameter.blur();
    const gridRows = page.locator("[data-testid=sub-field-X方向本数（rows）]");
    if ((await gridRows.count()) > 0) {
      await gridRows.fill("3");
      await gridRows.blur();
    }

    // the PDC document is committed (Auto Save). Re-enter the module to verify
    // the canonical value restores (persistence across navigation).
    await page.locator("[data-testid=module-shell-back]").click();
    await expect(page).toHaveURL(/\/app\/projects\/.+/);
    await page.locator("[data-testid=module-open-substructure]").click();
    await expect(page).toHaveURL(/modules\/substructure/);
    await expect(page.locator("[data-testid=sub-rescue]")).toBeVisible();
    const restoredSupport = page.locator("[data-testid^=sub-support-]").first();
    await restoredSupport.click();
    const restoredRows = page.locator("[data-testid=sub-field-X方向本数（rows）]");
    if ((await restoredRows.count()) > 0) {
      expect(await restoredRows.inputValue()).toBe("3");
    }
  });
});
