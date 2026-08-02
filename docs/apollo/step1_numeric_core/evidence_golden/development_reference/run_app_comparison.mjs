/**
 * Development-only Apollo GUI capture for GOLD-SP-001 / GOLD-SP-002.
 * UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION
 *
 * Does not import production sectionProperties. Compares scraped UI values
 * to development_reference/reference_results.json fixed before app run.
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../../../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;
const REF = JSON.parse(
  fs.readFileSync(path.join(OUT_DIR, "reference_results.json"), "utf8"),
);

const BASE = process.env.APOLLO_BASE_URL ?? "http://127.0.0.1:5173";
const A_DISPLAY = 5e-5;
const R_DISPLAY = 1e-12;

const LABEL_TO_KEY = {
  "ウェブ高さ": "webHeight",
  "上フランジ断面積": "topFlangeArea",
  "下フランジ断面積": "bottomFlangeArea",
  "ウェブ断面積": "webArea",
  "断面積合計": "totalArea",
  "図心位置（下面基準）": "centroidFromBottom",
  "断面2次モーメント": "secondMomentOfArea",
  "断面係数（上縁）": "sectionModulusTop",
  "断面係数（下縁）": "sectionModulusBottom",
  "主桁1本当たり鋼体積": "steelVolumePerGirder",
};


const CASES = [
  {
    id: "GOLD-SP-001",
    spanLength: "40",
    bridgeLength: "40",
    girderDepth: "2.5",
    topFlangeWidth: "0.5",
    topFlangeThickness: "0.03",
    bottomFlangeWidth: "0.5",
    bottomFlangeThickness: "0.03",
    webThickness: "0.012",
  },
  {
    id: "GOLD-SP-002",
    spanLength: "200",
    bridgeLength: "200",
    girderDepth: "2.5",
    topFlangeWidth: "0.5",
    topFlangeThickness: "0.02",
    bottomFlangeWidth: "0.6",
    bottomFlangeThickness: "0.025",
    webThickness: "0.012",
  },
];

function parseLocaleNumber(raw) {
  const cleaned = raw.replace(/,/g, "").trim();
  return Number(cleaned);
}

function verdict(expected, actual, A, R) {
  const absDiff = Math.abs(actual - expected);
  const relDiff = expected === 0 ? absDiff : absDiff / Math.abs(expected);
  const threshold = Math.max(A, R * Math.abs(expected));
  return {
    expected,
    actual,
    absoluteDifference: absDiff,
    relativeDifference: relDiff,
    A,
    R,
    threshold,
    verdict: absDiff <= threshold ? "PASS" : "FAIL",
  };
}

async function fillField(page, testId, value) {
  const input = page.getByTestId(testId);
  await input.click();
  await input.fill("");
  await input.type(value, { delay: 10 });
  await input.blur();
  await page.waitForTimeout(50);
}

async function dismissOnboardingIfPresent(page) {
  const close = page.getByRole("button", { name: /閉じる|スキップ|はじめる|OK|了解/i });
  if (await close.count()) {
    try {
      await close.first().click({ timeout: 2000 });
    } catch {
      /* ignore */
    }
  }
  // Force localStorage dismiss keys.
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

  // Prefer new project path to avoid continuous sample layout.
  const newBtn = page.getByRole("button", { name: "新規作成" });
  if (await newBtn.count()) {
    await newBtn.click();
  } else {
    // Fallback: sample then jump to basics
    const openSample = page.getByTestId("apollo-open-sample-selection");
    if (await openSample.count()) {
      await openSample.click();
      await page.getByTestId("apollo-load-standard-sample").click();
      await page.getByTestId("apollo-sample-guide-primary-next").click();
    }
  }

  // Ensure basics screen with bridge structure panel.
  for (let i = 0; i < 5; i++) {
    if (await page.getByTestId("apollo-bridge-structure-panel").count()) break;
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(300);
  }
  await page.getByTestId("apollo-bridge-structure-panel").waitFor({ timeout: 15000 });
}

async function ensureSimpleSingle(page) {
  const select = page.getByTestId("apollo-bridge-system-select");
  if (await select.count()) {
    await select.selectOption("SIMPLE_SINGLE");
  }
}

async function fillCommonGeometry(page) {
  // Remaining required fields from sample defaults (not Golden-varying).
  await fillField(page, "apollo-bridge-input-width", "10.5");
  await fillField(page, "apollo-bridge-input-girderCount", "4");
  await fillField(page, "apollo-bridge-input-girderSpacing", "3");
  await fillField(page, "apollo-bridge-input-deckThickness", "0.22");
  await fillField(page, "apollo-bridge-input-crossBeamSpacing", "5");
  await fillField(page, "apollo-bridge-input-steelUnitWeight", "77");
  await fillField(page, "apollo-bridge-input-rcUnitWeight", "24.5");
}

async function fillCase(page, spec) {
  await ensureSimpleSingle(page);
  await fillField(page, "apollo-bridge-input-spanLength", spec.spanLength);
  await fillField(page, "apollo-bridge-input-bridgeLength", spec.bridgeLength);
  await fillField(page, "apollo-bridge-input-girderDepth", spec.girderDepth);
  await fillField(page, "apollo-bridge-input-topFlangeWidth", spec.topFlangeWidth);
  await fillField(page, "apollo-bridge-input-topFlangeThickness", spec.topFlangeThickness);
  await fillField(page, "apollo-bridge-input-bottomFlangeWidth", spec.bottomFlangeWidth);
  await fillField(page, "apollo-bridge-input-bottomFlangeThickness", spec.bottomFlangeThickness);
  await fillField(page, "apollo-bridge-input-webThickness", spec.webThickness);
  await fillCommonGeometry(page);
}

async function readSectionProperties(page) {
  await page.getByTestId("apollo-bridge-structure-section-properties").waitFor({ timeout: 10000 });
  return page.evaluate((labelMap) => {
    const out = {};
    const rows = document.querySelectorAll(
      "[data-testid='apollo-bridge-structure-section-properties'] tbody tr",
    );
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;
      const label = cells[0]?.textContent?.trim() ?? "";
      const value = cells[1]?.textContent?.trim() ?? "";
      const key = (labelMap)[label];
      if (key) out[key] = value;
    });
    return out;
  }, LABEL_TO_KEY);
}

async function readInputs(page) {
  const ids = [
    "spanLength",
    "bridgeLength",
    "girderDepth",
    "topFlangeWidth",
    "topFlangeThickness",
    "bottomFlangeWidth",
    "bottomFlangeThickness",
    "webThickness",
    "width",
    "girderCount",
    "girderSpacing",
    "deckThickness",
    "crossBeamSpacing",
  ];
  const out = {};
  for (const id of ids) {
    out[id] = await page.getByTestId(`apollo-bridge-input-${id}`).inputValue();
  }
  out.bridgeSystem = await page.getByTestId("apollo-bridge-system-select").inputValue();
  return out;
}

async function runCase(page, spec) {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await gotoApolloBasics(page);
  await fillCase(page, spec);

  const inputsBefore = await readInputs(page);
  const props = await readSectionProperties(page);
  const panelText = await page.getByTestId("apollo-bridge-structure-section-properties").innerText();

  // Generate structure
  await page.getByTestId("apollo-generate-structure").click();
  await page.waitForTimeout(500);
  const sdmVisible = (await page.getByTestId("apollo-bridge-structure-sdm-summary").count()) > 0;
  const authText = sdmVisible
    ? await page.getByTestId("apollo-bridge-structure-sdm-summary").innerText()
    : "";

  // Workspace save then reopen (confirm unsaved guard if shown).
  let workspaceSaveOk = false;
  let workspaceReloadOk = false;
  let saveReloadPropsMatch = false;
  const listModeBtn = page.getByRole("button", { name: /一覧編集モード/ });
  if (await listModeBtn.count()) {
    await listModeBtn.first().click();
    await page.waitForTimeout(400);
  }
  if (await page.getByTestId("apollo-workspace-save").count()) {
    await page.getByTestId("apollo-workspace-save").click();
    await page.waitForTimeout(400);
    workspaceSaveOk = true;
    if (await page.getByTestId("apollo-workspace-open").count()) {
      await page.getByTestId("apollo-workspace-open").click();
      await page.waitForTimeout(200);
      const guard = page.getByTestId("apollo-unsaved-guard-dialog");
      if (await guard.count()) {
        const confirm = guard.getByRole("button", { name: /続行|開く|OK|はい|破棄/ });
        if (await confirm.count()) await confirm.first().click();
        else await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(600);
      workspaceReloadOk = true;
    }
  }
  if (!(await page.getByTestId("apollo-bridge-structure-section-properties").count())) {
    const basics = page.getByRole("button", { name: /基本情報/ });
    if (await basics.count()) await basics.first().click();
    await page.waitForTimeout(400);
  }

  const propsAfterReload = await readSectionProperties(page).catch(() => ({}));
  if (Object.keys(propsAfterReload).length) {
    saveReloadPropsMatch = Object.entries(props).every(([k, v]) => propsAfterReload[k] === v);
  }

  // Dismiss any leftover guard before STALE edits.
  if (await page.getByTestId("apollo-unsaved-guard-dialog").count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }

  // STALE: edit depth slightly then restore
  await fillField(page, "apollo-bridge-input-girderDepth", "2.501");
  await page.waitForTimeout(200);
  const staleVisible =
    (await page.getByTestId("apollo-bridge-structure-stale-message").count()) > 0;
  await fillField(page, "apollo-bridge-input-girderDepth", spec.girderDepth);
  await page.getByTestId("apollo-generate-structure").click();
  await page.waitForTimeout(400);
  const propsAfterRegen = await readSectionProperties(page);

  // Screenshot
  const shotPath = path.join(OUT_DIR, `screenshot_${spec.id}.png`);
  await page.screenshot({ path: shotPath, fullPage: true });

  // Compare display path
  const expected = REF.cases[spec.id].results;
  const comparisons = {};
  let allPass = true;
  for (const [key, display] of Object.entries(propsAfterRegen)) {
    if (!(key in expected)) continue;
    const row = verdict(Number(expected[key]), parseLocaleNumber(display), A_DISPLAY, R_DISPLAY);
    comparisons[key] = row;
    if (row.verdict !== "PASS") allPass = false;
  }

  return {
    caseId: spec.id,
    label: "UNVERIFIED_DEVELOPMENT_ONLY",
    designOrConstructionUse: "PROHIBITED",
    numericDesignAuthorization: "NOT_GRANTED",
    inputsBefore,
    sectionPropertiesDisplayed: props,
    sectionPropertiesAfterReload: propsAfterReload,
    sectionPropertiesAfterRegen: propsAfterRegen,
    panelTextSnippet: panelText.slice(0, 500),
    sdmVisible,
    authorizationSnippet: authText.slice(0, 500),
    workspaceSaveOk,
    workspaceReloadOk,
    saveReloadPropsMatch,
    staleVisible,
    screenshot: shotPath,
    consoleErrors,
    comparisons,
    developmentParity: allPass ? "PASS" : "FAIL",
    tolerance: { A_display: A_DISPLAY, R_display: R_DISPLAY, status: "FROZEN_BEFORE_APP_COMPARISON" },
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();

  const health = await page.goto(BASE, { waitUntil: "domcontentloaded" }).then(
    (r) => ({ ok: r?.ok() ?? false, status: r?.status() ?? 0 }),
    (e) => ({ ok: false, status: 0, error: String(e) }),
  );

  const results = [];
  for (const spec of CASES) {
    results.push(await runCase(page, spec));
  }

  await browser.close();

  const report = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    health,
    developmentTolerance: {
      status: "FROZEN_BEFORE_APP_COMPARISON",
      A_display: A_DISPLAY,
      R_display: R_DISPLAY,
      releaseUse: "PROHIBITED",
    },
    referenceSha256: createHash("sha256")
      .update(fs.readFileSync(path.join(OUT_DIR, "reference_results.json")))
      .digest("hex"),
    cases: results,
    overallDevelopmentParity: results.every((r) => r.developmentParity === "PASS")
      ? "PASS"
      : "FAIL",
  };

  const jsonPath = path.join(OUT_DIR, "comparison_report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

  const md = [
    "# Development App Comparison Report",
    "",
    "UNVERIFIED DEVELOPMENT RESULT — NOT FOR DESIGN OR CONSTRUCTION",
    "",
    `BASE: ${BASE}`,
    `Health: ${JSON.stringify(health)}`,
    `Overall development parity: **${report.overallDevelopmentParity}**`,
    `Tolerance: A_display=${A_DISPLAY}, R_display=${R_DISPLAY} (FROZEN_BEFORE_APP_COMPARISON)`,
    `Reference SHA256: ${report.referenceSha256}`,
    "",
  ];
  for (const c of results) {
    md.push(`## ${c.caseId} — ${c.developmentParity}`);
    md.push("");
    md.push(`- SDM visible: ${c.sdmVisible}`);
    md.push(`- Workspace save/reload: ${c.workspaceSaveOk}/${c.workspaceReloadOk}`);
    md.push(`- STALE after edit: ${c.staleVisible}`);
    md.push(`- Screenshot: \`${path.basename(c.screenshot)}\``);
    md.push(`- Console errors: ${c.consoleErrors.length}`);
    md.push("");
    md.push("| quantity | expected | actual | absDiff | threshold | verdict |");
    md.push("|----------|----------|--------|---------|-----------|---------|");
    for (const [k, row] of Object.entries(c.comparisons)) {
      md.push(
        `| ${k} | ${row.expected} | ${row.actual} | ${row.absoluteDifference} | ${row.threshold} | ${row.verdict} |`,
      );
    }
    md.push("");
  }
  fs.writeFileSync(path.join(OUT_DIR, "comparison_report.md"), md.join("\n") + "\n");
  console.log(JSON.stringify({ overall: report.overallDevelopmentParity, jsonPath }, null, 2));
  if (report.overallDevelopmentParity !== "PASS") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
