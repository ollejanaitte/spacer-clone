/**
 * Development-only GUI smoke for demand candidate panel.
 * UNVERIFIED — NOT FOR DESIGN OR CONSTRUCTION
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.APOLLO_BASE_URL ?? "http://127.0.0.1:5173";
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, "demand_candidate_results.json"), "utf8"));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/pro/apollo`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("apollo_phase1_onboarding_dismissed", "true");
    localStorage.setItem("apollo_phase1_sample_guide_dismissed", "true");
  });
  await page.reload({ waitUntil: "networkidle" });
  const newBtn = page.getByRole("button", { name: "新規作成" });
  if (await newBtn.count()) await newBtn.click();
  for (let i = 0; i < 5; i++) {
    if (await page.getByTestId("apollo-demand-development-panel").count()) break;
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(300);
  }
  await page.getByTestId("apollo-demand-development-panel").waitFor({ timeout: 20000 });
  const warning = await page.getByTestId("apollo-demand-development-warning").textContent();
  const provenance = await page.getByTestId("apollo-demand-development-provenance").textContent();
  await page.getByTestId("apollo-demand-reveal-candidates").click();
  await page.getByTestId("apollo-demand-development-table").waitFor();
  const top = Number(await page.getByTestId("apollo-demand-value-bendingStressTop").textContent());
  const expected = Number(REF.candidates.bendingStressTop_kNpm2);
  const absDiff = Math.abs(top - expected);
  const pass =
    Boolean(warning?.includes("UNVERIFIED")) &&
    Boolean(provenance?.includes("CANDIDATE")) &&
    Boolean(provenance?.includes("NOT_EMITTED")) &&
    absDiff <= Math.max(1e-6, 1e-9 * Math.abs(expected));
  await page.screenshot({ path: path.join(__dirname, "gui_demand_candidates.png"), fullPage: true });
  await browser.close();
  const report = {
    overall: pass ? "PASS" : "FAIL",
    warning,
    provenance,
    bendingStressTop: { expected, actual: top, absoluteDifference: absDiff },
    formalOkNg: "NOT_EMITTED",
  };
  fs.writeFileSync(path.join(__dirname, "gui_demand_comparison_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
