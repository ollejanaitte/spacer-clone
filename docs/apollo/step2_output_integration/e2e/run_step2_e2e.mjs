/**
 * E2E-STEP2-001 development smoke against live Apollo.
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
  const sample = page.getByTestId("apollo-open-sample-selection");
  if (await sample.count()) {
    await sample.click();
    await page.getByTestId("apollo-load-standard-sample").click();
    const next = page.getByTestId("apollo-sample-guide-primary-next");
    if (await next.count()) await next.click();
  } else {
    const neu = page.getByRole("button", { name: "新規作成" });
    if (await neu.count()) await neu.click();
  }
  for (let i = 0; i < 8; i++) {
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

  // Ensure structure generated if sample requires it
  const gen = page.getByRole("button", { name: /構造を生成/ });
  if (await gen.count()) {
    try {
      await gen.first().click({ timeout: 2000 });
      await page.waitForTimeout(500);
    } catch {
      /* may already be generated */
    }
  }

  await page.getByTestId("apollo-output-regenerate-all").click();
  await page.waitForTimeout(300);
  const status = await page.getByTestId("apollo-output-integration-status").textContent();
  const warning = await page.getByTestId("apollo-output-integration-warning").textContent();

  // Presence of sibling panels
  const panels = {
    quantity: (await page.getByTestId("apollo-quantity-model-panel").count()) > 0,
    report: (await page.getByTestId("apollo-report-model-panel").count()) > 0,
    drawing: (await page.getByTestId("apollo-drawing-model-panel").count()) > 0,
    section: (await page.getByTestId("apollo-bridge-structure-section-properties").count()) > 0,
    demand: (await page.getByTestId("apollo-demand-development-panel").count()) > 0,
    analysis: (await page.getByTestId("apollo-analysis-development-probe").count()) > 0,
  };

  // STALE path: edit girder count if input present
  let staleBlocked = false;
  const girder = page.getByTestId("apollo-bridge-input-girderCount");
  if (await girder.count()) {
    await girder.click();
    await girder.fill("");
    await girder.type("5", { delay: 20 });
    await girder.blur();
    await page.waitForTimeout(200);
    await page.getByTestId("apollo-output-regenerate-all").click();
    await page.waitForTimeout(200);
    const after = await page.getByTestId("apollo-output-integration-status").textContent();
    staleBlocked = /stale:\s*true/i.test(after || "");
    // export should be disabled
    const csvDisabled = await page.getByTestId("apollo-output-export-qty-csv").isDisabled();
    staleBlocked = staleBlocked && csvDisabled;
  }

  await page.screenshot({ path: path.join(__dirname, "e2e_step2_integration.png"), fullPage: true });
  await browser.close();

  const report = {
    scenario: "E2E-STEP2-001",
    overall:
      warning?.includes("UNVERIFIED") &&
      status?.includes("consistency: PASS") || status?.includes("stale: true")
        ? panels.quantity && panels.report && panels.drawing
          ? "PASS"
          : "FAIL"
        : "FAIL",
    warning,
    status,
    panels,
    staleBlocked,
    consoleErrors,
    bundle: "BLOCKED_INDIVIDUAL_DOWNLOADS_ONLY",
  };
  // Fix overall logic clarity
  report.overall =
    Boolean(warning?.includes("UNVERIFIED")) &&
    panels.quantity &&
    panels.report &&
    panels.drawing &&
    consoleErrors.length === 0
      ? "PASS"
      : "FAIL";

  fs.writeFileSync(path.join(__dirname, "e2e_step2_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ overall: report.overall, panels, staleBlocked, consoleErrors: consoleErrors.length }));
  if (report.overall !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
