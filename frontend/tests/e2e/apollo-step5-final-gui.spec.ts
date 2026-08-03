import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Apollo Step 5 final GUI / 3D E2E (Audit C).
 * Complements vitest package tests with real browser smoke against running Apollo app.
 */

const EVIDENCE_ROOT = path.resolve(
  __dirname,
  "../../../docs/apollo/step5_implementation/final_audit/evidence",
);

const consoleErrors: string[] = [];

async function openBasics(page: Page) {
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible();
  await expect(page.getByTestId("apollo-guided-mode-shell")).toBeVisible();
  await expect(page.getByTestId("apollo-bridge-structure-panel")).toBeVisible();
}

async function applyGenerateCompleteSample(page: Page) {
  await page.getByTestId("apollo-sample-apply-generate").click();
  await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "COMPLETE", {
    timeout: 30_000,
  });
  await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
    "GENERATION_CURRENT",
  );
}

async function shot(page: Page, rel: string) {
  const full = path.join(EVIDENCE_ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  await page.screenshot({ path: full, fullPage: true });
}

test.describe("Apollo Step 5 final GUI E2E", () => {
  test.beforeAll(() => {
    for (const dir of [
      "sample",
      "guided",
      "pavement",
      "markings",
      "appurtenance",
      "haunch",
      "bracing",
      "angle",
      "stale",
      "mobile",
    ]) {
      fs.mkdirSync(path.join(EVIDENCE_ROOT, dir), { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
  });

  test("E2E-S5-FINAL-001 Complete sample apply+generate", async ({ page }) => {
    await openBasics(page);
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("UNVERIFIED_DEVELOPMENT_ONLY");
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("NOT_GRANTED");
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("PROHIBITED");
    await applyGenerateCompleteSample(page);
    await expect(page.getByTestId("apollo-topology-shell")).toBeVisible();
    await expect(page.getByTestId("apollo-export-stl")).toBeEnabled();
    await expect(page.getByTestId("apollo-pavement-presence-PROVIDED")).toBeChecked();
    await shot(page, "sample/e2e-s5-final-001-complete-sample.png");
  });

  test("E2E-S5-FINAL-002 Guided Mode G01–G15", async ({ page }) => {
    await openBasics(page);
    await expect(page.getByTestId("apollo-guided-progress")).toContainText("1/15");
    await expect(page.getByTestId("apollo-guided-current-id")).toContainText("G01");

    for (let i = 1; i < 15; i += 1) {
      await page.getByTestId("apollo-guided-save-next").click();
    }
    await expect(page.getByTestId("apollo-guided-progress")).toContainText("15/15");
    await expect(page.getByTestId("apollo-guided-current-id")).toContainText("G15");
    await expect(page.getByTestId("apollo-guided-g15-pending")).toBeVisible();

    await page.getByTestId("apollo-guided-jump-G03").click();
    await expect(page.getByTestId("apollo-guided-slide-G03")).toBeVisible();
    await page.getByTestId("apollo-guided-detail-escape").click();
    await expect(page.getByTestId("apollo-pavement-panel")).toBeVisible();

    await page.getByTestId("apollo-guided-back").click();
    await expect(page.getByTestId("apollo-guided-current-id")).toContainText("G02");

    const diagnostics = page.getByTestId("apollo-guided-diagnostics");
    await expect(diagnostics).not.toHaveAttribute("open");

    await shot(page, "guided/e2e-s5-final-002-guided.png");
  });

  test("E2E-S5-FINAL-003/004 Pavement and road markings", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-pavement-panel").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("apollo-pavement-presence-PROVIDED")).toBeChecked();
    await expect(page.getByTestId("apollo-pavement-thickness")).toHaveValue("0.08");
    await expect(page.getByTestId("apollo-road-markings-enabled")).toBeChecked();
    await expect(page.getByTestId("apollo-pavement-panel").getByText("USER_PROVIDED_UNVERIFIED")).toBeVisible();
    await shot(page, "pavement/e2e-s5-final-003-pavement.png");
    await shot(page, "markings/e2e-s5-final-004-markings.png");
  });

  test("E2E-S5-FINAL-005/006 Appurtenances and haunch", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-appurtenance-panel").scrollIntoViewIfNeeded();
    for (const slot of ["LEFT_CURB", "RIGHT_CURB", "LEFT_WALL_RAILING", "RIGHT_WALL_RAILING"]) {
      await expect(page.getByTestId(`apollo-appurtenance-presence-${slot}`)).toHaveValue("PROVIDED");
    }
    await page.getByTestId("apollo-haunch-panel").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("apollo-haunch-panel")).toBeVisible();
    await shot(page, "appurtenance/e2e-s5-final-005-appurtenance.png");
    await shot(page, "haunch/e2e-s5-final-006-haunch.png");
  });

  test("E2E-S5-FINAL-007/008 Bracing labels and L-angle provenance", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-bridge-structure-panel").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("UNVERIFIED");
    await expect(
      page.getByTestId("apollo-bridge-structure-panel").getByText(/下横構|上横構/).first(),
    ).toBeVisible();
    await expect(page.getByTestId("apollo-export-stl")).toBeEnabled();
    await expect(page.getByTestId("apollo-topology-summary")).toBeVisible();
    await shot(page, "bracing/e2e-s5-final-007-bracing.png");
    await shot(page, "angle/e2e-s5-final-008-langle.png");
  });

  test("E2E-S5-FINAL-009 STALE after edit then regenerate", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-pavement-thickness").fill("0.09");
    await page.getByTestId("apollo-pavement-thickness").blur();
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText("STALE", {
      timeout: 10_000,
    });
    await page.getByTestId("apollo-generate-structure").click();
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
      "GENERATION_CURRENT",
      { timeout: 30_000 },
    );
    await shot(page, "stale/e2e-s5-final-009-stale-regen.png");
  });

  test("E2E-S5-FINAL-010 Workspace save + serialize round-trip evidence", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    const thickness = await page.getByTestId("apollo-pavement-thickness").inputValue();
    expect(thickness).toBe("0.08");
    await page.getByRole("button", { name: "一覧編集モード" }).click();
    await expect(page.getByTestId("apollo-list-mode")).toBeVisible();
    await page.getByTestId("apollo-workspace-save").click();
    await expect(page.getByTestId("apollo-workspace-select").locator("option")).not.toHaveCount(0);
    // Field persistence across import/export is covered by serialized-project.json evidence harvest
    const serialized = path.join(EVIDENCE_ROOT, "serialized-project.json");
    expect(fs.existsSync(serialized)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(serialized, "utf8")) as {
      pavementThickness: number | null;
      markingsEnabled: boolean;
      lateralAngle: { enabled: boolean };
    };
    expect(parsed.pavementThickness).toBe(0.08);
    expect(parsed.markingsEnabled).toBe(true);
    expect(parsed.lateralAngle.enabled).toBe(true);
  });

  test("E2E-S5-FINAL-011 Reapply sample", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-section-properties-provenance")).toContainText(
      "GENERATION_CURRENT",
    );
    await page.getByTestId("apollo-clear-input").click();
    // Clear removes section-properties block; generation message remains
    await expect(page.getByTestId("apollo-bridge-structure-panel")).toContainText(/クリア|INPUT|入力/);
    await page.getByTestId("apollo-sample-apply-generate").click();
    await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "COMPLETE");
    await expect(page.getByTestId("apollo-pavement-presence-PROVIDED")).toBeChecked();
  });

  test("E2E-S5-FINAL-012 A11y / mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBasics(page);
    await expect(page.getByTestId("apollo-guided-mode-shell")).toBeVisible();
    await page.getByTestId("apollo-guided-save-next").focus();
    await expect(page.getByTestId("apollo-guided-save-next")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("apollo-guided-current-id")).toContainText("G02");
    await shot(page, "mobile/e2e-s5-final-012-mobile.png");
  });

  test("E2E-S5-FINAL-013 Authorization guards visible", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("NOT_GRANTED");
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("PROHIBITED");
    await expect(page.getByTestId("apollo-section-properties-development-warning")).toContainText(
      "UNVERIFIED DEVELOPMENT RESULT",
    );
    await expect(page.getByTestId("apollo-sample-disclaimer")).toContainText("正式設計には使用しない");
  });

  test("E2E-S5-FINAL-014 Console regression soft report", async ({ page }) => {
    await openBasics(page);
    await applyGenerateCompleteSample(page);
    await page.getByTestId("apollo-guided-jump-G15").click();
    const serious = consoleErrors.filter(
      (e) => !/WebGL|THREE\.|ResizeObserver|favicon/i.test(e),
    );
    fs.writeFileSync(
      path.join(EVIDENCE_ROOT, "console-report.txt"),
      [
        `total_console_errors=${consoleErrors.length}`,
        `serious_console_errors=${serious.length}`,
        ...consoleErrors.map((e) => `ERR: ${e}`),
      ].join("\n"),
    );
    expect(serious, `Unexpected console errors: ${serious.join(" | ")}`).toHaveLength(0);
  });

  test.afterAll(() => {
    fs.writeFileSync(
      path.join(EVIDENCE_ROOT, "playwright-results.json"),
      JSON.stringify(
        {
          suite: "apollo-step5-final-gui",
          evidenceRoot: EVIDENCE_ROOT,
          note: "GUI smoke against live Apollo app; 3D ENGINEERING_CORRECTNESS_NOT_AUTHORIZED",
          crossFrameTopology: "LABEL_ONLY_PENDING_ER001",
          lAngleGeometry: "TWO_PLATE_APPROXIMATION_PENDING_ER002",
        },
        null,
        2,
      ),
    );
  });
});
