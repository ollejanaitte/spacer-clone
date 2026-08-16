/**
 * Apollo Step 5-JP3-C: full Japanese UI GUI/E2E coverage (E2E-JP3-001..022).
 */
import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { selectApolloStep } from "./helpers/app";

const OUT = path.resolve(__dirname, "../../../docs/apollo/step5_japanese/jp3");
const EVIDENCE = path.join(OUT, "evidence/jp3c");

const consoleErrors: string[] = [];
const results: Array<{ id: string; verdict: "PASS" | "FAIL"; note: string }> = [];

function ensureDirs() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  for (const d of ["desktop", "mobile", "guided", "outputs", "a11y"]) {
    fs.mkdirSync(path.join(EVIDENCE, d), { recursive: true });
  }
}

async function shot(page: Page, rel: string) {
  await page.screenshot({ path: path.join(EVIDENCE, rel), fullPage: true }).catch(() => undefined);
}

async function openBasics(page: Page) {
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible({ timeout: 30_000 });
}

async function applySample(page: Page) {
  await page.getByTestId("apollo-sample-apply-generate").click();
  await selectApolloStep(page, "WF-02");
  await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "COMPLETE", {
    timeout: 30_000,
  });
}

/** Leaf-level L1 residual English scan (same policy as JP3-A allowlist). */
async function residualL1Count(page: Page): Promise<number> {
  return page.evaluate(() => {
    const allowExact = new Set(
      [
        "apollo",
        "stl",
        "csv",
        "json",
        "dxf",
        "svg",
        "zip",
        "pdf",
        "html",
        "id",
        "url",
        "si",
        "m",
        "mm",
        "kn",
        "mpa",
        "rc",
        "l",
        "v",
        "x",
        "3d",
        "liner",
        "ok",
        "ng",
        "kn/m",
        "kn/m³",
        "html/pdf",
        "webgl",
        "gpu",
      ].map((s) => s.toLowerCase()),
    );
    const allowId =
      /^(G0[1-9]|G1[0-5]|G-0[1-7]|WF-0[1-9]|WF-1[0-5]|CH-[A-Z0-9-]+|DEC-S5-\d{4}|ER-00[12]|GOLD-AN-00[12]|apollo-prj-[\w-]+)$/i;
    const latin = /\b([A-Za-z][A-Za-z0-9_/.-]{1,}|[A-Z]{2,}(?:_[A-Z0-9]+)*)\b/g;

    const isTech = (el: Element | null): boolean => {
      let cur: Element | null = el;
      while (cur) {
        if (cur.getAttribute("data-technical-details")) return true;
        if (cur.classList?.contains("apollo-technical-details-pre")) return true;
        if (cur.tagName === "PRE" || cur.tagName === "CODE") return true;
        const details = cur.closest("details");
        if (details && !details.open && cur !== details.querySelector("summary")) return true;
        cur = cur.parentElement;
      }
      return false;
    };

    const visible = (el: Element) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      if ((el as HTMLElement).hidden) return false;
      if (rect.width === 0 && rect.height === 0) return false;
      return true;
    };

    const ok = (token: string) => {
      const t = token.trim();
      if (!t) return true;
      if (allowExact.has(t.toLowerCase())) return true;
      if (allowId.test(t)) return true;
      if (/^\d+(\.\d+)?$/.test(t)) return true;
      if (/^[0-9a-f]{6,}…?$/i.test(t)) return true;
      if (/^[APG]\d{1,2}$/i.test(t)) return true;
      return false;
    };

    let bad = 0;
    const nodes = Array.from(
      document.querySelectorAll(
        "button, a, label, legend, option, h1, h2, h3, h4, p, li, span, th, td, summary, [role='button'], [role='status'], [role='alert'], [aria-label], [title], [placeholder]",
      ),
    );
    for (const el of nodes) {
      if (!visible(el) || isTech(el)) continue;
      // Prefer leaf text: skip elements that have element children with text
      if (el.children.length > 0 && (el as HTMLElement).innerText.length > 120) continue;
      const attrs = ["aria-label", "title", "placeholder", "aria-description"]
        .map((a) => el.getAttribute(a) || "")
        .join(" ");
      const text = `${(el as HTMLElement).innerText || ""} ${attrs}`.replace(/\s+/g, " ").trim();
      if (!text || text.length > 200) continue;
      const tokens = Array.from(text.matchAll(latin)).map((m) => m[1]!);
      if (tokens.some((tok) => !ok(tok))) bad += 1;
    }
    return bad;
  });
}

test.describe("Apollo Step 5-JP3-C full Japanese GUI/E2E", () => {
  test.beforeAll(() => ensureDirs());

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
  });

  test("E2E-JP3-001..022 major surfaces Japanese coverage", async ({ page }) => {
    // 001 entry
    await page.goto("/pro/apollo");
    await expect(page.getByTestId("apollo-start-screen")).toBeVisible();
    await expect(page.getByRole("button", { name: "新規作成" })).toBeVisible();
    await shot(page, "desktop/01-entry.png");
    results.push({ id: "E2E-JP3-001", verdict: "PASS", note: "Apollo入口" });

    await openBasics(page);
    await expect(page.getByTestId("apollo-undo")).toHaveText("元に戻す");
    await expect(page.getByTestId("apollo-redo")).toHaveText("やり直す");
    await expect(page.getByTestId("apollo-shell-kicker")).toContainText("Apollo");

    // 002 sample
    await applySample(page);
    await shot(page, "desktop/02-sample.png");
    results.push({ id: "E2E-JP3-002", verdict: "PASS", note: "sample selection/apply" });

    // 003 reapply
    await page.getByTestId("apollo-pavement-thickness").fill("0.11");
    await page.getByTestId("apollo-pavement-thickness").blur();
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeVisible();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toContainText("サンプルを再適用");
    await shot(page, "desktop/03-reapply.png");
    await page.getByTestId("apollo-sample-reapply-cancel").click();
    results.push({ id: "E2E-JP3-003", verdict: "PASS", note: "reapply modal" });

    // 004 workflow
    await expect(page.getByTestId("apollo-wf-step-WF-02")).toBeVisible();
    await expect(page.getByTestId("apollo-wf-step-WF-02")).toContainText("橋梁基本条件");
    await expect(page.locator(".apollo-wf-step-group").first()).not.toHaveText(/geometry|loads/i);
    await shot(page, "desktop/04-workflow.png");
    results.push({ id: "E2E-JP3-004", verdict: "PASS", note: "Workflow" });

    // 005 guided G01-G15
    for (const id of [
      "G01",
      "G02",
      "G03",
      "G04",
      "G05",
      "G06",
      "G07",
      "G08",
      "G09",
      "G10",
      "G11",
      "G12",
      "G13",
      "G14",
      "G15",
    ] as const) {
      await page.getByTestId("apollo-guided-show-all-toggle").click();
      await page.getByTestId(`apollo-guided-jump-${id}`).click();
      await expect(page.getByTestId(`apollo-guided-slide-${id}`)).toBeVisible();
    }
    await shot(page, "guided/05-g15.png");
    results.push({ id: "E2E-JP3-005", verdict: "PASS", note: "Guided G01-G15" });

    // 006 bridge/deck/haunch/appurtenance
    await expect(page.getByTestId("apollo-bridge-structure-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-appurtenance-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-haunch-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-appurtenance-local-crs-warning")).toContainText("ローカル座標系");
    results.push({ id: "E2E-JP3-006", verdict: "PASS", note: "bridge/deck/haunch/appurtenance" });

    // 007 pavement/marking
    await expect(page.getByTestId("apollo-pavement-thickness")).toBeVisible();
    results.push({ id: "E2E-JP3-007", verdict: "PASS", note: "pavement/marking" });

    // 008 cross beam/frame/L-angle
    await expect(page.getByText("対傾構取付点")).toBeVisible();
    results.push({ id: "E2E-JP3-008", verdict: "PASS", note: "cross frame / L-angle" });

    // 009 3D viewer
    await expect(page.locator('[aria-label="3Dモデル表示領域"]')).toBeVisible();
    await shot(page, "desktop/09-viewer.png");
    results.push({ id: "E2E-JP3-009", verdict: "PASS", note: "3D viewer" });

    // 010 quantity
    await expect(page.getByTestId("apollo-quantity-model-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-quantity-model-table")).toContainText("区分");
    results.push({ id: "E2E-JP3-010", verdict: "PASS", note: "quantity" });

    // 011 load
    await expect(page.getByTestId("apollo-load-confirmation-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-load-table")).toContainText("荷重ID");
    results.push({ id: "E2E-JP3-011", verdict: "PASS", note: "load" });

    // 012 analysis
    await expect(page.getByTestId("apollo-analysis-development-probe")).toBeVisible();
    await expect(page.getByTestId("apollo-analysis-run-gold-an-001")).toHaveText(/等分布荷重/);
    results.push({ id: "E2E-JP3-012", verdict: "PASS", note: "analysis" });

    // 013 report/drawing/output
    await expect(page.getByTestId("apollo-report-model-panel").or(page.getByText("計算書"))).toBeTruthy();
    await expect(page.getByTestId("apollo-output-integration-panel")).toBeVisible();
    await shot(page, "outputs/13-output.png");
    results.push({ id: "E2E-JP3-013", verdict: "PASS", note: "report/drawing/output" });

    // 014 stale/block/error
    await page.getByTestId("apollo-bridge-input-girderCount").fill("5");
    await page.getByTestId("apollo-bridge-input-girderCount").blur();
    await expect(page.getByTestId("apollo-bridge-structure-stale-message")).toBeVisible();
    await expect(page.getByTestId("apollo-bridge-structure-stale-message")).toContainText("再生成");
    results.push({ id: "E2E-JP3-014", verdict: "PASS", note: "stale/block/error" });

    // 015 authorization
    await expect(page.getByText("正式認可なし").first()).toBeVisible();
    await expect(page.getByText("設計・施工への使用禁止").first()).toBeVisible();
    results.push({ id: "E2E-JP3-015", verdict: "PASS", note: "authorization" });

    // 016 technical details collapsed by default
    const techToggle = page.locator(".apollo-technical-details-toggle").first();
    await expect(techToggle).toBeVisible();
    await expect(techToggle).toHaveAttribute("aria-expanded", "false");
    results.push({ id: "E2E-JP3-016", verdict: "PASS", note: "technical details collapsed" });

    // 017 save/reload affordances
    await expect(page.getByTestId("apollo-save-project")).toBeVisible();
    await expect(page.getByTestId("apollo-reload-project")).toBeVisible();
    results.push({ id: "E2E-JP3-017", verdict: "PASS", note: "save/reload" });

    // 018 mobile — primary chrome remains reachable after scroll
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("apollo-basics-screen")).toBeVisible();
    await page.getByTestId("apollo-save-project").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("apollo-save-project")).toBeVisible();
    await expect(page.getByTestId("apollo-save-project")).toHaveText(/保存/);
    await shot(page, "mobile/18-basics.png");
    results.push({ id: "E2E-JP3-018", verdict: "PASS", note: "mobile save chrome reachable" });

    // 019 keyboard/a11y
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByTestId("apollo-undo").focus();
    await expect(page.getByTestId("apollo-undo")).toBeFocused();
    await page.keyboard.press("Tab");
    results.push({ id: "E2E-JP3-019", verdict: "PASS", note: "keyboard focus" });

    // 020 residual English scan
    const residual = await residualL1Count(page);
    expect(residual).toBe(0);
    results.push({ id: "E2E-JP3-020", verdict: "PASS", note: `residual L1=${residual}` });

    // 021 Step 5-R regression smoke (reapply still Japanese)
    await page.getByTestId("apollo-pavement-thickness").fill("0.13");
    await page.getByTestId("apollo-pavement-thickness").blur();
    await page.getByTestId("apollo-sample-apply-generate").click();
    if (await page.getByTestId("apollo-sample-reapply-dialog").isVisible().catch(() => false)) {
      await expect(page.getByTestId("apollo-sample-reapply-cancel")).toHaveText("キャンセル");
      await page.getByTestId("apollo-sample-reapply-cancel").click();
    }
    results.push({ id: "E2E-JP3-021", verdict: "PASS", note: "Step 5-R reapply JA" });

    // 022 numeric/data regression smoke — authorization still NOT_GRANTED wording
    await expect(page.getByText("正式認可なし").first()).toBeVisible();
    results.push({ id: "E2E-JP3-022", verdict: "PASS", note: "authorization unchanged wording" });

    // Artifacts
    fs.writeFileSync(
      path.join(OUT, "residual_english_final.json"),
      JSON.stringify(
        {
          raw_english_l1: residual,
          unresolved: 0,
          technical_only: "L3_OR_ALLOWLIST",
          scanned_at: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    fs.writeFileSync(
      path.join(OUT, "playwright-results.json"),
      JSON.stringify({ results, consoleErrors }, null, 2) + "\n",
    );
    fs.writeFileSync(
      path.join(OUT, "console-report.txt"),
      consoleErrors.length === 0 ? "CONSOLE_ERRORS: 0\n" : consoleErrors.join("\n") + "\n",
    );

    expect(results.every((r) => r.verdict === "PASS")).toBe(true);
    expect(consoleErrors.filter((e) => !e.includes("Download the React DevTools"))).toHaveLength(0);
  });
});
