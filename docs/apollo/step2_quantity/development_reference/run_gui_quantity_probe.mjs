/**
 * GUI smoke for Step 2-A quantity panel.
 * UNVERIFIED DEVELOPMENT ONLY
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.APOLLO_BASE_URL ?? "http://127.0.0.1:5173";

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
  const sample = page.getByTestId("apollo-open-sample-selection");
  if (await sample.count()) {
    await sample.click();
    await page.getByTestId("apollo-load-standard-sample").click();
    const next = page.getByTestId("apollo-sample-guide-primary-next");
    if (await next.count()) await next.click();
  }
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId("apollo-quantity-model-panel").count()) break;
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(300);
  }
  await page.getByTestId("apollo-quantity-model-panel").waitFor({ timeout: 20000 });
  const warning = await page.getByTestId("apollo-quantity-development-warning").textContent();
  await page.getByTestId("apollo-quantity-regenerate").click();
  await page.waitForTimeout(200);
  const table = await page.getByTestId("apollo-quantity-model-table").count();
  await page.screenshot({ path: path.join(__dirname, "gui_quantity_panel.png"), fullPage: true });
  await browser.close();
  const pass = Boolean(warning?.includes("UNVERIFIED")) && table > 0;
  const report = { overall: pass ? "PASS" : "FAIL", warning, tablePresent: table > 0 };
  fs.writeFileSync(path.join(__dirname, "gui_quantity_comparison_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
