/**
 * Step 3-A GUI probe — GeneralArrangementPanel presence + generate + STALE.
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
  // Prefer empty project — Step 3-A scope is SIMPLE_SINGLE (not 200m continuous sample).
  const neu = page.getByRole("button", { name: "新規作成" });
  if (await neu.count()) {
    await neu.click();
  } else {
    const sample = page.getByTestId("apollo-open-sample-selection");
    if (await sample.count()) {
      await sample.click();
      await page.getByTestId("apollo-load-standard-sample").click();
      const next = page.getByTestId("apollo-sample-guide-primary-next");
      if (await next.count()) await next.click();
    }
  }
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId("apollo-general-arrangement-panel").count()) break;
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(250);
  }
  await page.getByTestId("apollo-general-arrangement-panel").waitFor({ timeout: 25000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await gotoBasics(page);

  // Ensure SIMPLE_SINGLE development sample values are loaded.
  const sampleInput = page.getByTestId("apollo-sample-input");
  if (await sampleInput.count()) {
    await sampleInput.click();
    await page.waitForTimeout(200);
  }

  const genStruct = page.getByRole("button", { name: /構造を生成/ });
  if (await genStruct.count()) {
    try {
      await genStruct.first().click({ timeout: 2000 });
      await page.waitForTimeout(500);
    } catch {
      /* already generated */
    }
  }

  await page.getByTestId("apollo-ga-regenerate").click();
  await page.waitForTimeout(300);
  const warning = await page.getByTestId("apollo-ga-development-warning").textContent();
  const provenance = await page.getByTestId("apollo-ga-provenance").textContent();
  const sheetStatus = await page.getByTestId("apollo-ga-sheet-status").textContent();

  let staleBlocked = false;
  const girder = page.getByTestId("apollo-bridge-input-girderCount");
  if (await girder.count()) {
    await girder.click();
    await girder.fill("");
    await girder.type("5", { delay: 20 });
    await girder.blur();
    await page.waitForTimeout(200);
    await page.getByTestId("apollo-ga-regenerate").click();
    await page.waitForTimeout(200);
    const after = await page.getByTestId("apollo-ga-provenance").textContent();
    staleBlocked = /stale:\s*true/i.test(after || "");
    const svgDisabled = await page.getByTestId("apollo-ga-export-svg").isDisabled();
    staleBlocked = staleBlocked && svgDisabled;
  }

  const shot = path.join(__dirname, "e2e_step3a_ga.png");
  await page.screenshot({ path: shot, fullPage: true });
  await browser.close();

  const report = {
    scenario: "E2E-STEP3A-001",
    overall:
      warning?.includes("DEVELOPMENT GENERAL ARRANGEMENT") &&
      sheetStatus?.includes("G-01") &&
      /sheets:\s*[1-9]/i.test(provenance || "") &&
      staleBlocked
        ? "PASS"
        : "FAIL",
    warning,
    provenance,
    sheetStatus,
    staleBlocked,
    consoleErrors,
    screenshot: shot,
    label: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorization: "NOT_GRANTED",
  };
  fs.writeFileSync(path.join(__dirname, "e2e_step3a_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ overall: report.overall, staleBlocked, sheetStatus }, null, 2));
  if (report.overall !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
