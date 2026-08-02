/**
 * Development-only GUI probe for GOLD-AN-001 / GOLD-AN-002.
 * UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, "analytical_reference_results.json"), "utf8"));
const BASE = process.env.APOLLO_BASE_URL ?? "http://127.0.0.1:5173";
const A = 1e-9;
const R = 1e-9;

function toNum(s) {
  return Number(s);
}

function compare(expected, actual) {
  const absDiff = Math.abs(actual - expected);
  const threshold = Math.max(A, R * Math.abs(expected));
  return {
    expected,
    actual,
    absoluteDifference: absDiff,
    relativeDifference: expected === 0 ? absDiff : absDiff / Math.abs(expected),
    A,
    R,
    threshold,
    verdict: absDiff <= threshold ? "PASS" : "FAIL",
  };
}

async function dismissOnboardingIfPresent(page) {
  await page.evaluate(() => {
    localStorage.setItem("apollo_phase1_onboarding_dismissed", "true");
    localStorage.setItem("apollo_phase1_sample_guide_dismissed", "true");
  });
}

async function gotoApolloBasics(page) {
  await page.goto(`${BASE}/pro/apollo`, { waitUntil: "networkidle" });
  await dismissOnboardingIfPresent(page);
  await page.reload({ waitUntil: "networkidle" });
  await dismissOnboardingIfPresent(page);
  const newBtn = page.getByRole("button", { name: "新規作成" });
  if (await newBtn.count()) await newBtn.click();
  for (let i = 0; i < 5; i++) {
    if (await page.getByTestId("apollo-analysis-development-probe").count()) break;
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(300);
  }
  await page.getByTestId("apollo-analysis-development-probe").waitFor({ timeout: 20000 });
}

async function runCase(page, caseId) {
  const button =
    caseId === "GOLD-AN-001"
      ? page.getByTestId("apollo-analysis-run-gold-an-001")
      : page.getByTestId("apollo-analysis-run-gold-an-002");
  await button.click();
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-testid='apollo-analysis-development-status']");
      return el && /status: success/.test(el.textContent || "");
    },
    null,
    { timeout: 30000 },
  );
  const rows = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll("[data-testid='apollo-analysis-development-table'] tbody tr").forEach((tr) => {
      const cells = tr.querySelectorAll("td");
      if (cells.length >= 3) {
        out[cells[0].textContent.trim()] = Number(cells[2].textContent.trim());
      }
    });
    return out;
  });
  const expected = REF.cases[caseId];
  const quantities = [
    ["leftReaction_fy_kN", toNum(expected.leftReaction_fy_kN)],
    ["rightReaction_fy_kN", toNum(expected.rightReaction_fy_kN)],
    ["Mmax_kNm", toNum(expected.Mmax_kNm)],
    ["centerDeflection_uy_m", toNum(expected.centerDeflection_uy_m)],
  ];
  const comparisons = {};
  let pass = true;
  for (const [key, exp] of quantities) {
    const row = compare(exp, rows[key]);
    comparisons[key] = row;
    if (row.verdict !== "PASS") pass = false;
  }
  return { caseId, pass, rows, comparisons };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await gotoApolloBasics(page);
  const warning = await page.getByTestId("apollo-analysis-development-warning").textContent();
  const c1 = await runCase(page, "GOLD-AN-001");
  await page.screenshot({
    path: path.join(__dirname, "gui_gold_an_001.png"),
    fullPage: true,
  });
  const c2 = await runCase(page, "GOLD-AN-002");
  await page.screenshot({
    path: path.join(__dirname, "gui_gold_an_002.png"),
    fullPage: true,
  });
  await browser.close();
  const report = {
    label: "UNVERIFIED_DEVELOPMENT_ONLY",
    numericDesignAuthorization: "NOT_GRANTED",
    designOrConstructionUse: "PROHIBITED",
    warning,
    consoleErrors,
    overall: c1.pass && c2.pass && warning?.includes("UNVERIFIED") ? "PASS" : "FAIL",
    cases: { "GOLD-AN-001": c1, "GOLD-AN-002": c2 },
  };
  fs.writeFileSync(path.join(__dirname, "gui_analysis_comparison_report.json"), JSON.stringify(report, null, 2));
  const md = [
    "# GUI Analysis Development Comparison",
    "",
    "UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION",
    "",
    `Overall: **${report.overall}**`,
    `Warning present: ${Boolean(warning?.includes("UNVERIFIED"))}`,
    `Console errors: ${consoleErrors.length}`,
    "",
  ];
  for (const caseId of ["GOLD-AN-001", "GOLD-AN-002"]) {
    const c = report.cases[caseId];
    md.push(`## ${caseId} — ${c.pass ? "PASS" : "FAIL"}`, "");
    md.push("| quantity | expected | actual | absDiff | threshold | verdict |", "|---|---|---|---|---|---|");
    for (const [k, row] of Object.entries(c.comparisons)) {
      md.push(
        `| ${k} | ${row.expected} | ${row.actual} | ${row.absoluteDifference} | ${row.threshold} | ${row.verdict} |`,
      );
    }
    md.push("");
  }
  fs.writeFileSync(path.join(__dirname, "gui_analysis_comparison_report.md"), md.join("\n"));
  console.log(JSON.stringify({ overall: report.overall, consoleErrors: consoleErrors.length }, null, 2));
  if (report.overall !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
