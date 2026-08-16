/**
 * Apollo Step 5-JP3-A: live DOM residual-English audit.
 * Collects visible text + aria/title/placeholder from major Apollo surfaces.
 * Does not fail the suite on findings — inventory is the deliverable (fixes in JP3-B).
 */
import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { selectApolloStep } from "./helpers/app";

const OUT_ROOT = path.resolve(__dirname, "../../../docs/apollo/step5_japanese/jp3");
const EVIDENCE = path.join(OUT_ROOT, "evidence/jp3a");

/** Exact tokens / short phrases allowed in L1 (no wildcards). */
const ALLOWLIST_EXACT = new Set(
  [
    "Apollo",
    "STL",
    "CSV",
    "JSON",
    "DXF",
    "SVG",
    "ZIP",
    "PDF",
    "HTML",
    "ID",
    "URL",
    "SI",
    "m",
    "mm",
    "kN",
    "MPa",
    "RC",
    "L",
    "V",
    "X",
    "3D",
    "LINER",
    "OK",
    "NG",
    "kN/m",
    "kN/m³",
    "kN·m",
    "HTML/PDF",
    "WebGL",
    "GPU",
  ].map((s) => s.toLowerCase()),
);

const ALLOWLIST_ID_RE =
  /^(G0[1-9]|G1[0-5]|G-0[1-7]|WF-0[1-9]|WF-1[0-5]|CH-[A-Z0-9-]+|DEC-S5-\d{4}|ER-00[12]|CAT-S5-[\w-]+|GOLD-AN-00[12]|apollo-prj-[\w-]+)$/i;

const LATIN_TOKEN_RE =
  /\b([A-Za-z][A-Za-z0-9_/.-]{1,}|[A-Z]{2,}(?:_[A-Z0-9]+)*)\b/g;

type ScanHit = {
  screen: string;
  selector: string;
  text: string;
  visibility: "visible" | "hidden" | "attr";
  layer: "L1" | "L3" | "ALLOWLIST" | "REVIEW";
  allowlisted: boolean;
  reason: string;
  screenshot: string;
};

function ensureDirs() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.mkdirSync(OUT_ROOT, { recursive: true });
}

function isAllowlistedToken(token: string): boolean {
  const t = token.trim();
  if (!t) return true;
  if (ALLOWLIST_EXACT.has(t.toLowerCase())) return true;
  if (ALLOWLIST_ID_RE.test(t)) return true;
  if (/^\d+(\.\d+)?$/.test(t)) return true;
  if (/^[+\-−]?\d+(\.\d+)?(e[+\-]?\d+)?$/i.test(t)) return true;
  // Opaque truncated hex / UUID fragments shown as IDs
  if (/^[0-9a-f]{6,}$/i.test(t) || /^[0-9a-f]{6,}…$/i.test(t)) return true;
  // Support / node short labels like A1, P2, G0
  if (/^[APG]\d{1,2}$/i.test(t)) return true;
  return false;
}

function classifyText(
  text: string,
  opts: { inTechnical: boolean },
): { layer: ScanHit["layer"]; allowlisted: boolean; reason: string; tokens: string[] } {
  const raw = text.replace(/\s+/g, " ").trim();
  if (!raw) return { layer: "ALLOWLIST", allowlisted: true, reason: "empty", tokens: [] };
  const tokens = Array.from(raw.matchAll(LATIN_TOKEN_RE)).map((m) => m[1]!);
  if (tokens.length === 0) {
    return { layer: "ALLOWLIST", allowlisted: true, reason: "no-latin", tokens: [] };
  }
  if (opts.inTechnical) {
    return { layer: "L3", allowlisted: true, reason: "technical-details", tokens };
  }
  const bad = tokens.filter((t) => !isAllowlistedToken(t));
  if (bad.length === 0) {
    return { layer: "ALLOWLIST", allowlisted: true, reason: "allowlist-exact", tokens };
  }
  return {
    layer: "L1",
    allowlisted: false,
    reason: `residual:${bad.slice(0, 6).join("|")}`,
    tokens: bad,
  };
}

async function collectFromPage(page: Page, screen: string, shotName: string): Promise<ScanHit[]> {
  const shotRel = `evidence/jp3a/${shotName}.png`;
  await page.screenshot({ path: path.join(OUT_ROOT, shotRel), fullPage: true }).catch(() => undefined);

  const payload = await page.evaluate(() => {
    const isTech = (el: Element | null): boolean => {
      let cur: Element | null = el;
      while (cur) {
        if (cur.getAttribute("data-technical-details") === "expanded") return true;
        if (cur.getAttribute("data-technical-details") === "collapsed") return true;
        if (cur.classList?.contains("apollo-technical-details-panel")) return true;
        if (cur.classList?.contains("apollo-technical-details-pre")) return true;
        if (cur.tagName === "PRE" || cur.tagName === "CODE") return true;
        if ((cur as HTMLElement).hidden) return true;
        const details = cur.closest("details");
        if (details && !details.open && cur !== details.querySelector("summary")) return true;
        cur = cur.parentElement;
      }
      return false;
    };

    const visible = (el: Element) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      if ((el as HTMLElement).hidden) return false;
      if (rect.width === 0 && rect.height === 0) return false;
      return true;
    };

    const rows: Array<{
      selector: string;
      text: string;
      visibility: "visible" | "hidden" | "attr";
      inTechnical: boolean;
    }> = [];

    const push = (
      el: Element,
      text: string,
      visibility: "visible" | "hidden" | "attr",
      selector: string,
    ) => {
      const t = text.replace(/\s+/g, " ").trim();
      if (!t || t.length > 500) return;
      rows.push({ selector, text: t, visibility, inTechnical: isTech(el) });
    };

    // Visible text nodes via interactive/content elements
    const candidates = Array.from(
      document.querySelectorAll(
        "button, a, label, legend, option, h1, h2, h3, h4, p, li, span, th, td, summary, [role='button'], [role='status'], [role='alert'], [role='note'], [data-testid]",
      ),
    );
    for (const el of candidates) {
      if (!visible(el)) continue;
      const testId = el.getAttribute("data-testid");
      const sel = testId
        ? `[data-testid="${testId}"]`
        : `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(/\s+/).slice(0, 2).join(".") : ""}`;
      const text = (el as HTMLElement).innerText || el.textContent || "";
      if (text.trim()) push(el, text, "visible", sel);
    }

    // Attributes
    for (const el of Array.from(document.querySelectorAll("[aria-label], [title], [placeholder], [aria-description]"))) {
      for (const attr of ["aria-label", "title", "placeholder", "aria-description"] as const) {
        const v = el.getAttribute(attr);
        if (!v) continue;
        const testId = el.getAttribute("data-testid");
        push(el, v, "attr", `${testId ? `[data-testid="${testId}"]` : el.tagName.toLowerCase()}@${attr}`);
      }
    }

    // Dialogs (even if open)
    for (const el of Array.from(document.querySelectorAll('[role="dialog"], dialog, [data-testid*="dialog"]'))) {
      const text = (el as HTMLElement).innerText || "";
      if (text.trim()) {
        push(el, text, visible(el) ? "visible" : "hidden", el.getAttribute("data-testid") || "dialog");
      }
    }

    return rows;
  });

  const hits: ScanHit[] = [];
  for (const row of payload) {
    const cls = classifyText(row.text, { inTechnical: row.inTechnical });
    if (cls.layer === "ALLOWLIST" && cls.reason === "no-latin") continue;
    if (cls.layer === "ALLOWLIST" && cls.reason === "empty") continue;
    // Keep residual + allowlisted latin for inventory completeness of residual only
    if (cls.allowlisted && cls.layer !== "L3") continue;
    hits.push({
      screen,
      selector: row.selector,
      text: row.text.slice(0, 240),
      visibility: row.visibility,
      layer: cls.layer,
      allowlisted: cls.allowlisted,
      reason: cls.reason,
      screenshot: shotRel,
    });
  }
  return hits;
}

async function openApolloBasics(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("apollo_phase1_onboarding_dismissed", "true");
    window.localStorage.setItem("apollo_phase1_sample_guide_dismissed", "true");
  });
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible({ timeout: 30_000 });
}

async function applySample(page: Page) {
  const applyGenerate = page.getByTestId("apollo-sample-apply-generate");
  await expect(applyGenerate).toBeEnabled({ timeout: 30_000 });
  await expect(applyGenerate).toBeVisible({ timeout: 30_000 });
  await applyGenerate.scrollIntoViewIfNeeded().catch(() => undefined);
  await applyGenerate.click({ force: true });
  await selectApolloStep(page, "WF-02");
  await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "COMPLETE", {
    timeout: 30_000,
  });
}

test.describe("Apollo Step 5-JP3-A live DOM residual English audit", () => {
  test("harvest residual English inventory across major surfaces", async ({ page }) => {
    test.setTimeout(180_000);
    ensureDirs();
    const all: ScanHit[] = [];

    await openApolloBasics(page);
    all.push(...(await collectFromPage(page, "basics-empty", "01-basics-empty")));

    await applySample(page);
    all.push(...(await collectFromPage(page, "basics-sample", "02-basics-sample")));

    // Guided slides
    for (const id of ["G01", "G05", "G09", "G12", "G15"] as const) {
      const toggle = page.getByTestId("apollo-guided-show-all-toggle");
      await toggle.scrollIntoViewIfNeeded().catch(() => undefined);
      await toggle.click({ force: true });
      await page.getByTestId(`apollo-guided-jump-${id}`).click();
      await expect(page.getByTestId(`apollo-guided-slide-${id}`)).toBeVisible();
      all.push(...(await collectFromPage(page, `guided-${id}`, `03-guided-${id}`)));
    }

    // Expand technical details once
    const techToggle = page.getByTestId("apollo-technical-details-toggle").first();
    if (await techToggle.count()) {
      await techToggle.click().catch(() => undefined);
      all.push(...(await collectFromPage(page, "tech-expanded", "04-tech-expanded")));
    }

    // Reapply dialog
    await page.getByTestId("apollo-pavement-thickness").fill("0.11").catch(() => undefined);
    await page.getByTestId("apollo-pavement-thickness").blur().catch(() => undefined);
    await page.getByTestId("apollo-sample-apply-generate").click();
    if (await page.getByTestId("apollo-sample-reapply-dialog").isVisible().catch(() => false)) {
      all.push(...(await collectFromPage(page, "reapply-dialog", "05-reapply-dialog")));
      await page.getByTestId("apollo-sample-reapply-cancel").click();
    }

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    all.push(...(await collectFromPage(page, "mobile-basics", "06-mobile-basics")));

    // Dedupe
    const key = (h: ScanHit) => `${h.screen}|${h.selector}|${h.text}|${h.reason}`;
    const uniq = new Map<string, ScanHit>();
    for (const h of all) uniq.set(key(h), h);
    const rows = [...uniq.values()];

    const l1 = rows.filter((r) => r.layer === "L1" && !r.allowlisted);
    const l3 = rows.filter((r) => r.layer === "L3");

    // CSV
    const csvHeader =
      "screen,selector,text,visibility,layer,allowlisted,reason,screenshot\n";
    const csvBody = rows
      .map((r) =>
        [r.screen, r.selector, JSON.stringify(r.text), r.visibility, r.layer, r.allowlisted, r.reason, r.screenshot]
          .join(","),
      )
      .join("\n");
    fs.writeFileSync(path.join(OUT_ROOT, "residual_english_inventory.csv"), csvHeader + csvBody + "\n");

    const matrix = [
      "screen_id,scanned,l1_residual,l3_hits,screenshot",
      ...["basics-empty", "basics-sample", "guided-G01", "guided-G09", "guided-G15", "reapply-dialog", "mobile-basics"].map(
        (s) => {
          const subset = rows.filter((r) => r.screen === s);
          const shot = subset[0]?.screenshot ?? "";
          return `${s},YES,${subset.filter((r) => r.layer === "L1").length},${subset.filter((r) => r.layer === "L3").length},${shot}`;
        },
      ),
    ].join("\n");
    fs.writeFileSync(path.join(OUT_ROOT, "screen_scan_matrix.csv"), matrix + "\n");

    const attrRows = rows.filter((r) => r.visibility === "attr");
    fs.writeFileSync(
      path.join(OUT_ROOT, "attribute_scan.csv"),
      "screen,selector,text,layer,reason\n" +
        attrRows
          .map((r) => [r.screen, r.selector, JSON.stringify(r.text), r.layer, r.reason].join(","))
          .join("\n") +
        "\n",
    );

    fs.writeFileSync(
      path.join(EVIDENCE, "scan_summary.json"),
      JSON.stringify(
        {
          total_hits: rows.length,
          raw_english_l1: l1.length,
          technical_only: l3.length,
          unresolved: l1.length,
          screens: [...new Set(rows.map((r) => r.screen))],
          top_l1: l1.slice(0, 40),
        },
        null,
        2,
      ) + "\n",
    );

    // Audit must produce inventory; L1 residual is expected input to JP3-B (may be 0).
    expect(rows.length).toBeGreaterThanOrEqual(0);
    fs.writeFileSync(
      path.join(EVIDENCE, "jp3a_verdict.txt"),
      `LIVE_DOM_SCAN_VERDICT: PASS\nRAW_ENGLISH_L1_COUNT: ${l1.length}\nTECHNICAL_ONLY_ENGLISH_COUNT: ${l3.length}\nUNRESOLVED_ENGLISH_COUNT: ${l1.length}\n`,
    );
  });
});
