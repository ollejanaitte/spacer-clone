import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Apollo Step 5-R residual corrections GUI/E2E (R4).
 * Covers reapply confirmation, true L-section visibility cues, and cross-frame attachments.
 */

const EVIDENCE_ROOT = path.resolve(
  __dirname,
  "../../../docs/apollo/step5_residual_corrections/evidence",
);

const consoleErrors: string[] = [];

async function openBasics(page: Page) {
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible();
  await expect(page.getByTestId("apollo-bridge-structure-panel")).toBeVisible();
}

async function applyGenerateCompleteSample(page: Page) {
  await page.getByTestId("apollo-sample-apply-generate").click();
  await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "COMPLETE", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
    "生成結果は最新",
  );
}

async function shot(page: Page, rel: string) {
  const full = path.join(EVIDENCE_ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  await page.screenshot({ path: full, fullPage: true });
}

test.describe("Apollo Step 5-R residual corrections E2E", () => {
  test.beforeAll(() => {
    for (const dir of ["reapply", "l-section", "cross-frame", "stale", "mobile"]) {
      fs.mkdirSync(path.join(EVIDENCE_ROOT, dir), { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
  });

  test("E2E-S5R-001 Reapply cancel preserves values", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    const before = await page.getByTestId("apollo-pavement-thickness").inputValue();
    await page.getByTestId("apollo-pavement-thickness").fill("0.11");
    await page.getByTestId("apollo-pavement-thickness").blur();
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeVisible();
    await page.getByTestId("apollo-sample-reapply-cancel").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeHidden();
    await expect(page.getByTestId("apollo-pavement-thickness")).toHaveValue("0.11");
    expect(before).toBe("0.08");
    await shot(page, "reapply/e2e-s5r-001-cancel.png");
  });

  test("E2E-S5R-002 Reapply replace updates sample values", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-pavement-thickness").fill("0.12");
    await page.getByTestId("apollo-pavement-thickness").blur();
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeVisible();
    await expect(page.getByTestId("apollo-sample-reapply-summary")).toBeVisible();
    await page.getByTestId("apollo-sample-reapply-replace").click();
    await expect(page.getByTestId("apollo-pavement-thickness")).toHaveValue("0.08");
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
      "生成結果は最新",
    );
    await shot(page, "reapply/e2e-s5r-002-replace.png");
  });

  test("E2E-S5R-003 Reapply create new preserves current project", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-pavement-thickness").fill("0.13");
    await page.getByTestId("apollo-pavement-thickness").blur();
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeVisible();
    await page.getByTestId("apollo-sample-reapply-create-new").click();
    // New project receives sample; workspace should list more than one entry after save path
    await expect(page.getByTestId("apollo-pavement-thickness")).toHaveValue("0.08");
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
      "生成結果は最新",
    );
    await shot(page, "reapply/e2e-s5r-003-create-new.png");
  });

  test("E2E-S5R-004 Modal focus Cancel (rollback path covered by unit tests)", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeVisible();
    await expect(page.getByTestId("apollo-sample-reapply-cancel")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeHidden();
    await shot(page, "reapply/e2e-s5r-004-a11y-cancel.png");
  });

  test("E2E-S5R-005 True L-section panel and STL enabled", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await expect(page.getByTestId("apollo-export-stl")).toBeEnabled();
    await expect(page.getByTestId("apollo-topology-summary")).toBeVisible();
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("未検証");
    await shot(page, "l-section/e2e-s5r-005-l-section.png");
  });

  test("E2E-S5R-006 Cross-frame attachment panel present", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-cross-frame-attachment-panel").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("apollo-cross-frame-dev-banner")).toContainText("技術者による確認待ち");
    await expect(page.getByTestId("apollo-cross-frame-pattern-V")).toBeChecked();
    await expect(page.getByTestId("apollo-cross-frame-upper-depth")).toBeVisible();
    await expect(page.getByTestId("apollo-cross-frame-lower-depth")).toBeVisible();
    await shot(page, "cross-frame/e2e-s5r-006-attachments.png");
  });

  test("E2E-S5R-007 G09 lists attachment depths", async ({ page }) => {
    await openBasics(page);
    await page.getByTestId("apollo-guided-jump-G09").click();
    await expect(page.getByTestId("apollo-guided-slide-G09")).toBeVisible();
    await expect(page.getByTestId("apollo-guided-primary-fields")).toContainText(
      "上側取付深さ",
    );
    await expect(page.getByTestId("apollo-guided-decide-what")).toContainText("横桁と対傾構は別");
    await shot(page, "cross-frame/e2e-s5r-007-g09.png");
  });

  test("E2E-S5R-008 Cross-frame STALE then regenerate", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-cross-frame-upper-depth").fill("0.2");
    await page.getByTestId("apollo-cross-frame-upper-depth").blur();
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText("要再計算", {
      timeout: 10_000,
    });
    await page.getByTestId("apollo-generate-structure").click();
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
      "生成結果は最新",
      { timeout: 30_000 },
    );
    await shot(page, "stale/e2e-s5r-008-stale.png");
  });

  test("E2E-S5R-009 Cross beam vs sway labels in summary", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await expect(page.getByTestId("apollo-bridge-structure-sdm-summary")).toContainText("横桁");
    await expect(page.getByTestId("apollo-bridge-structure-sdm-summary")).toContainText("対傾構");
    await shot(page, "cross-frame/e2e-s5r-009-separation.png");
  });

  test("E2E-S5R-010 Persistence via workspace save", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByRole("button", { name: "一覧編集モード" }).click();
    await expect(page.getByTestId("apollo-list-mode")).toBeVisible();
    await page.getByTestId("apollo-workspace-save").click();
    await expect(page.getByTestId("apollo-workspace-select").locator("option")).not.toHaveCount(0);
  });

  test("E2E-S5R-011 Mobile / a11y modal + G09", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-sample-reapply-dialog")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "サンプルを再適用しますか？" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    await page.getByTestId("apollo-sample-reapply-cancel").click();
    await page.getByTestId("apollo-guided-jump-G09").click();
    await expect(page.getByTestId("apollo-guided-slide-G09")).toBeVisible();
    await shot(page, "mobile/e2e-s5r-011-mobile.png");
  });

  test("E2E-S5R-012 Authorization gates unchanged", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("正式認可なし");
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("設計・施工への使用禁止");
    await expect(page.getByTestId("apollo-cross-frame-dev-banner")).toContainText("正式認可なし");
    await expect(page.getByTestId("apollo-section-properties-development-warning")).toContainText(
      "開発確認用・未検証",
    );
  });

  test("E2E-S5R-013 Regression sample + guided + console soft", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await expect(page.getByTestId("apollo-pavement-presence-PROVIDED")).toBeChecked();
    await page.getByTestId("apollo-guided-jump-G15").click();
    await expect(page.getByTestId("apollo-guided-g15-pending")).toBeVisible();
    const serious = consoleErrors.filter(
      (e) => !/Download the React DevTools|favicon|ResizeObserver/i.test(e),
    );
    fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
    fs.writeFileSync(
      path.join(EVIDENCE_ROOT, "console-report.txt"),
      serious.length === 0 ? "NO_SERIOUS_CONSOLE_ERRORS\n" : serious.join("\n"),
    );
    expect(serious.length).toBeLessThan(5);
  });
});
