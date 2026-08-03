/**
 * E2E-STEP3-001 final development deliverables workflow against live Apollo.
 * UNVERIFIED — NOT FOR DESIGN OR CONSTRUCTION
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(__dirname, "../../../../frontend/package.json"));
const { chromium } = require("playwright");
const BASE = process.env.APOLLO_BASE_URL ?? "http://127.0.0.1:5173";

async function gotoBasics(page) {
  await page.goto(`${BASE}/pro/apollo`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("apollo_phase1_onboarding_dismissed", "true");
    localStorage.setItem("apollo_phase1_sample_guide_dismissed", "true");
  });
  await page.reload({ waitUntil: "networkidle" });
  const neu = page.getByRole("button", { name: "新規作成" });
  if (await neu.count()) await neu.click();
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("apollo-output-integration-panel").count()) break;
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(250);
  }
  await page.getByTestId("apollo-output-integration-panel").waitFor({ timeout: 25000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await gotoBasics(page);

  const sampleInput = page.getByTestId("apollo-sample-input");
  if (await sampleInput.count()) {
    await sampleInput.click();
    await page.waitForTimeout(200);
  }
  const genStruct = page.getByRole("button", { name: /構造を生成/ });
  if (await genStruct.count()) {
    try {
      await genStruct.first().click({ timeout: 2000 });
      await page.waitForTimeout(600);
    } catch {
      /* ok */
    }
  }

  // Panels presence
  const panels = {
    quantity: (await page.getByTestId("apollo-quantity-model-panel").count()) > 0,
    report: (await page.getByTestId("apollo-report-model-panel").count()) > 0,
    drawing: (await page.getByTestId("apollo-drawing-model-panel").count()) > 0,
    ga: (await page.getByTestId("apollo-general-arrangement-panel").count()) > 0,
    output: (await page.getByTestId("apollo-output-integration-panel").count()) > 0,
    section: (await page.getByTestId("apollo-bridge-structure-section-properties").count()) > 0,
    demand: (await page.getByTestId("apollo-demand-development-panel").count()) > 0,
    analysis: (await page.getByTestId("apollo-analysis-development-probe").count()) > 0,
  };

  await page.getByTestId("apollo-output-regenerate-all").click();
  await page.waitForTimeout(400);
  await page.getByTestId("apollo-ga-regenerate").click();
  await page.waitForTimeout(300);

  const status = await page.getByTestId("apollo-output-integration-status").textContent();
  const sheets = await page.getByTestId("apollo-output-sheet-register").textContent();
  const warning = await page.getByTestId("apollo-output-integration-warning").textContent();
  const checklist = await page.getByTestId("apollo-output-user-checklist").textContent();

  await page.getByTestId("apollo-output-validate-all").click();
  await page.waitForTimeout(200);
  const validation = await page.getByTestId("apollo-output-validation-note").textContent().catch(() => null);

  // STALE path
  let staleBlocked = false;
  const girder = page.getByTestId("apollo-bridge-input-girderCount");
  if (await girder.count()) {
    await girder.click();
    await girder.fill("");
    await girder.type("5", { delay: 20 });
    await girder.blur();
    await page.waitForTimeout(200);
    await page.getByTestId("apollo-output-regenerate-all").click();
    await page.waitForTimeout(250);
    const after = await page.getByTestId("apollo-output-integration-status").textContent();
    staleBlocked = /stale:\s*true/i.test(after || "");
    const zipDisabled = await page.getByTestId("apollo-output-export-zip").isDisabled();
    const csvDisabled = await page.getByTestId("apollo-output-export-qty-csv").isDisabled();
    staleBlocked = staleBlocked && zipDisabled && csvDisabled;
  }

  const shot = path.join(__dirname, "e2e_step3_final.png");
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();

  const report = {
    scenario: "E2E-STEP3-001",
    overall:
      warning?.includes("UNVERIFIED") &&
      /G-01.*G-07|G-01, G-02, G-03, G-04, G-05, G-06, G-07/.test(sheets || "") &&
      /drawingSet:\s*READY|drawingSet:\s*STALE/.test(status || "") &&
      checklist?.includes("O. ZIP") &&
      panels.ga &&
      panels.output &&
      staleBlocked
        ? "PASS"
        : "FAIL",
    panels,
    status,
    sheets,
    warning,
    validation,
    staleBlocked,
    consoleErrors,
    screenshot: shot,
    label: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorization: "NOT_GRANTED",
  };
  fs.writeFileSync(path.join(__dirname, "e2e_step3_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ overall: report.overall, staleBlocked, sheets, panels }, null, 2));
  if (report.overall !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
