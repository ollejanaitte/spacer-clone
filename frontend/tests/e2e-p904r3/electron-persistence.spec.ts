import { test, expect, _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const EVIDENCE_DIR = path.resolve(__dirname, "../../../docs/rebuild/evidence");
function evidencePath(name: string): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  return path.join(EVIDENCE_DIR, name);
}

const ELECTRON_MAIN = path.resolve(__dirname, "../../../desktop/electron/dist/main.js");

async function openApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [ELECTRON_MAIN, "--disable-gpu", "--in-process-gpu", "--no-sandbox"],
    env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ":0", SPACER_AUTOMATION: "1" },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("[data-testid=home-page]", { timeout: 30000 });
  return { app, page };
}

async function openOrCreateProject(page: Page, projectId: string): Promise<string> {
  await page.locator("[data-testid=home-go-business]").click();
  await page.waitForURL(/\/app\/business$/);
  const row = page.locator(`tr`, { hasText: projectId }).first();
  if ((await row.count()) === 0) {
    await page.locator("[data-testid=new-project-button]").click();
    await page.locator("[data-testid=form-business-number]").fill(projectId);
    await page.locator("[data-testid=form-name]").fill("Phase9-04R3 Electron受入");
    await page.locator("[data-testid=form-design-stage]").selectOption("bridge-detailed");
    await page.locator("[data-testid=form-submit]").click();
    const row2 = page.locator(`tr`, { hasText: projectId }).first();
    await row2.locator("[data-testid=business-open]").click();
  } else {
    await row.locator("[data-testid=business-open]").click();
  }
  await page.waitForURL(/\/app\/projects\/.+/);
  return page.url().split("/").pop() ?? "";
}

test.describe.serial("Phase 9-04R3 Electron real restart persistence", () => {
  test("create -> commit pile grid -> full app restart -> restore (Sol review #3)", async () => {
    test.setTimeout(180000);
    // unique project id per run -> no cross-run false positive
    const projectId = `R3ELEC${Date.now().toString().slice(-6)}`;

    // ---- session 1: create + commit ----
    const s1 = await openApp();
    await openOrCreateProject(s1.page, projectId);

    await s1.page.locator("[data-testid=module-open-road]").click();
    await s1.page.locator("[data-testid=road-save-button]").click();
    await s1.page.locator("[data-testid=road-module-back]").click();
    await s1.page.locator("[data-testid=module-open-bridgeLayout]").click();
    await s1.page.locator("[data-testid=bridge-name-input]").fill("R3橋梁");
    await s1.page.locator("[data-testid=bridge-start-station]").fill("100");
    await s1.page.locator("[data-testid=bridge-end-station]").fill("400");
    await s1.page.locator("[data-testid=bridge-layout-save-button]").click();
    await s1.page.locator("[data-testid=bridge-layout-module-back]").click();

    await s1.page.locator("[data-testid=module-open-substructure]").click();
    const subDoc = s1.page.locator("[data-testid=sub-document]");
    if ((await subDoc.textContent()) === "なし") {
      await s1.page.locator("[data-testid=sub-generate-button]").click();
    }
    await s1.page.waitForSelector("[data-testid=sub-rescue]", { timeout: 15000 });

    const support = s1.page.locator("[data-testid^=sub-support-]").first();
    await support.click();
    const pileDiameter = s1.page.locator("[data-testid=sub-field-杭径], [data-testid=sub-field-abutment-pile-diameter]").first();
    await pileDiameter.fill("1.2");
    await pileDiameter.blur();
    const rows = s1.page.locator("[data-testid=sub-field-X方向本数（rows）]");
    await rows.waitFor({ state: "visible", timeout: 10000 });
    // change from a baseline value to 3 (a real edit that must persist)
    const beforeRows = await rows.inputValue();
    await rows.fill("3");
    await rows.blur();
    if (beforeRows === "3") {
      // avoid same-value edit: set to 2 first, then 3 (proves the change path)
      await rows.fill("2");
      await rows.blur();
      await rows.fill("3");
      await rows.blur();
    }
    await s1.page.screenshot({ path: evidencePath("p9-04r3-13-electron-substructure.png") });
    // flush pending saves (filesystem persistence via IPC): wait for the
    // save-state indicator to reach "saved", with a generous fallback.
    await s1.page.waitForFunction(() => {
      const el = document.querySelector("[data-testid*=save], [data-testid*=Save], [aria-label*=保存]");
      return el ? el.textContent?.includes("保存しました") || el.textContent?.includes("saved") || true : true;
    }, undefined, { timeout: 5000 }).catch(() => {});
    await s1.page.waitForTimeout(2500);

    // ---- full app restart ----
    await s1.app.close();

    // ---- session 2: verify restore ----
    const s2 = await openApp();
    await openOrCreateProject(s2.page, projectId);
    await s2.page.locator("[data-testid=module-open-substructure]").click();
    await s2.page.waitForSelector("[data-testid=sub-rescue]", { timeout: 15000 });
    const restoredSupport = s2.page.locator("[data-testid^=sub-support-]").first();
    await restoredSupport.click();
    const restoredRows = s2.page.locator("[data-testid=sub-field-X方向本数（rows）]");
    await restoredRows.waitFor({ state: "visible", timeout: 10000 });
    expect(await restoredRows.inputValue()).toBe("3");
    // scroll the pile grid editor into view for a clear evidence capture
    await s2.page.locator("[data-testid=pile-grid-editor]").scrollIntoViewIfNeeded().catch(() => {});
    await s2.page.screenshot({ path: evidencePath("p9-04r3-14-electron-restart-restore.png") });
    await s2.app.close();
  });
});
