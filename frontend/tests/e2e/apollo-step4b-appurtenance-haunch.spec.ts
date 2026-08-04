import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Apollo Step 4-B WF-03 / WF-05 E2E.
 * E2E-S4B-001..007 — appurtenance + haunch canonical input.
 */

const EVIDENCE_DIR = path.resolve(
  __dirname,
  "../../../docs/apollo/step4_appurtenance_haunch/evidence",
);

async function openWorkflowScreen(page: import("@playwright/test").Page) {
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible();
  await expect(page.getByTestId("apollo-workflow-control-screen")).toBeVisible();
}

async function fillSampleAndGenerate(page: import("@playwright/test").Page) {
  await page
    .getByTestId("apollo-bridge-structure-panel")
    .getByRole("button", { name: "動作確認用サンプル値を入力" })
    .click();
  await page
    .getByTestId("apollo-bridge-structure-panel")
    .getByRole("button", { name: "構造を生成" })
    .click();
  await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "COMPLETE");
}

async function setAllAppurtenancesNone(page: import("@playwright/test").Page) {
  await page.getByTestId("apollo-appurtenance-panel").scrollIntoViewIfNeeded();
  await page.getByTestId("apollo-appurtenance-all-none").click();
}

async function setAllHaunchesNone(page: import("@playwright/test").Page) {
  await page.getByTestId("apollo-haunch-panel").scrollIntoViewIfNeeded();
  await page.getByTestId("apollo-haunch-all-none").click();
}

test.describe("Apollo Step 4-B appurtenance / haunch", () => {
  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test("E2E-S4B-001: legacy sample migration shows NOT_PROVIDED (no auto entities)", async ({
    page,
  }) => {
    await openWorkflowScreen(page);
    await fillSampleAndGenerate(page);

    await expect(page.getByTestId("apollo-appurtenance-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-haunch-panel")).toBeVisible();

    for (const slot of [
      "LEFT_CURB",
      "RIGHT_CURB",
      "LEFT_WALL_RAILING",
      "RIGHT_WALL_RAILING",
      "MEDIAN",
      "OPTIONAL_BARRIER",
    ]) {
      await expect(page.getByTestId(`apollo-appurtenance-presence-${slot}`)).toHaveValue(
        "NOT_PROVIDED",
      );
    }

    const wf03 = page.getByTestId("apollo-wf-step-WF-03");
    await expect(wf03).toHaveAttribute("data-status", /AVAILABLE|INCOMPLETE|READY|RECOMMENDED/);
    await expect(wf03).not.toHaveAttribute("data-status", "COMPLETE");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-001-not-provided.png"),
      fullPage: true,
    });
  });

  test("E2E-S4B-002: explicit none → regenerate → WF-03/WF-05 COMPLETE + NOT_AUTHORIZED", async ({
    page,
  }) => {
    await openWorkflowScreen(page);
    await fillSampleAndGenerate(page);
    await setAllAppurtenancesNone(page);
    await setAllHaunchesNone(page);

    await page.getByTestId("apollo-appurtenance-regenerate").click();

    await expect(page.getByTestId("apollo-wf-step-WF-03")).toHaveAttribute("data-status", "COMPLETE");
    await expect(page.getByTestId("apollo-wf-step-WF-05")).toHaveAttribute("data-status", "COMPLETE");
    await expect(page.getByTestId("apollo-wf-step-WF-03")).toContainText("NOT_AUTHORIZED");
    await expect(page.getByTestId("apollo-wf-step-WF-05")).toContainText("NOT_AUTHORIZED");
    await expect(page.getByTestId("apollo-haunch-context")).toContainText("BSSD haunches: 0");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-002-explicit-none-complete.png"),
      fullPage: true,
    });
  });

  test("E2E-S4B-003: appurtenance PROVIDED for curbs", async ({ page }) => {
    await openWorkflowScreen(page);
    await fillSampleAndGenerate(page);
    await setAllAppurtenancesNone(page);
    await setAllHaunchesNone(page);

    await page.getByTestId("apollo-appurtenance-presence-LEFT_CURB").selectOption("PROVIDED");
    await page.getByTestId("apollo-appurtenance-full-length-LEFT_CURB").click();
    await page.getByTestId("apollo-appurtenance-offset-LEFT_CURB").fill("-5");
    await page.getByTestId("apollo-appurtenance-offset-LEFT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-shape-LEFT_CURB").selectOption("RECT");
    await page.getByTestId("apollo-appurtenance-width-LEFT_CURB").fill("0.5");
    await page.getByTestId("apollo-appurtenance-width-LEFT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-height-LEFT_CURB").fill("0.25");
    await page.getByTestId("apollo-appurtenance-height-LEFT_CURB").press("Enter");

    await page.getByTestId("apollo-appurtenance-presence-RIGHT_CURB").selectOption("PROVIDED");
    await page.getByTestId("apollo-appurtenance-full-length-RIGHT_CURB").click();
    await page.getByTestId("apollo-appurtenance-offset-RIGHT_CURB").fill("5");
    await page.getByTestId("apollo-appurtenance-offset-RIGHT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-shape-RIGHT_CURB").selectOption("RECT");
    await page.getByTestId("apollo-appurtenance-width-RIGHT_CURB").fill("0.5");
    await page.getByTestId("apollo-appurtenance-width-RIGHT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-height-RIGHT_CURB").fill("0.25");
    await page.getByTestId("apollo-appurtenance-height-RIGHT_CURB").press("Enter");

    await page.getByTestId("apollo-appurtenance-regenerate").click();
    await expect(page.getByTestId("apollo-wf-step-WF-03")).toHaveAttribute("data-status", "COMPLETE");
    await expect(page.getByTestId("apollo-appurtenance-local-crs-warning")).toContainText("Step 4-E");
    await expect(page.getByTestId("apollo-appurtenance-dev-banner")).toContainText("NOT_GRANTED");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-003-appurtenance-provided.png"),
      fullPage: true,
    });
  });

  test("E2E-S4B-004: haunch apply-all RECT projects to BSSD", async ({ page }) => {
    await openWorkflowScreen(page);
    await fillSampleAndGenerate(page);
    await setAllAppurtenancesNone(page);

    await page.getByTestId("apollo-haunch-apply-shape").selectOption("RECT");
    await page.getByTestId("apollo-haunch-apply-top-width").fill("0.4");
    await page.getByTestId("apollo-haunch-apply-top-width").press("Enter");
    await page.getByTestId("apollo-haunch-apply-height").fill("0.15");
    await page.getByTestId("apollo-haunch-apply-height").press("Enter");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("apollo-haunch-apply-all-button").click();
    await page.getByTestId("apollo-haunch-regenerate").click();

    await expect(page.getByTestId("apollo-wf-step-WF-05")).toHaveAttribute("data-status", "COMPLETE");
    await expect(page.getByTestId("apollo-haunch-context")).toContainText("BSSD haunches: 4");
    await expect(page.getByTestId("apollo-wf-step-WF-05")).toContainText("NOT_AUTHORIZED");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-004-haunch-provided.png"),
      fullPage: true,
    });
  });

  test("E2E-S4B-005: invalid station BLOCKS WF-03", async ({ page }) => {
    await openWorkflowScreen(page);
    await fillSampleAndGenerate(page);
    await setAllAppurtenancesNone(page);
    await setAllHaunchesNone(page);

    await page.getByTestId("apollo-appurtenance-presence-LEFT_CURB").selectOption("PROVIDED");
    await page.getByTestId("apollo-appurtenance-start-LEFT_CURB").fill("20");
    await page.getByTestId("apollo-appurtenance-start-LEFT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-end-LEFT_CURB").fill("10");
    await page.getByTestId("apollo-appurtenance-end-LEFT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-offset-LEFT_CURB").fill("0");
    await page.getByTestId("apollo-appurtenance-offset-LEFT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-shape-LEFT_CURB").selectOption("RECT");
    await page.getByTestId("apollo-appurtenance-width-LEFT_CURB").fill("0.5");
    await page.getByTestId("apollo-appurtenance-width-LEFT_CURB").press("Enter");
    await page.getByTestId("apollo-appurtenance-height-LEFT_CURB").fill("0.25");
    await page.getByTestId("apollo-appurtenance-height-LEFT_CURB").press("Enter");

    await expect(page.getByTestId("apollo-wf-step-WF-03")).toHaveAttribute("data-status", "BLOCKED");
    await expect(page.getByTestId("apollo-appurtenance-diagnostics-LEFT_CURB")).toContainText(
      "測点範囲",
    );
    await expect(page.getByTestId("apollo-appurtenance-regenerate")).toBeDisabled();

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-005-blocked.png"),
      fullPage: true,
    });
  });

  test("E2E-S4B-006: input change after COMPLETE → STALE", async ({ page }) => {
    await openWorkflowScreen(page);
    await fillSampleAndGenerate(page);
    await setAllAppurtenancesNone(page);
    await setAllHaunchesNone(page);
    await page.getByTestId("apollo-appurtenance-regenerate").click();
    await expect(page.getByTestId("apollo-wf-step-WF-03")).toHaveAttribute("data-status", "COMPLETE");

    await page.getByTestId("apollo-appurtenance-presence-MEDIAN").selectOption("NOT_PROVIDED");
    await expect(page.getByTestId("apollo-wf-step-WF-03")).toHaveAttribute("data-status", "STALE");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-006-stale.png"),
      fullPage: true,
    });
  });

  test("E2E-S4B-007: scope guard — WF-06 PLANNED, panels present, Step 4-C not shipped", async ({
    page,
  }) => {
    await openWorkflowScreen(page);
    await expect(page.getByTestId("apollo-appurtenance-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-haunch-panel")).toBeVisible();
    await expect(page.getByTestId("apollo-wf-step-WF-06")).toHaveAttribute("data-status", "BLOCKED");
    await expect(page.getByTestId("apollo-appurtenance-local-crs-warning")).toContainText("Step 4-E");
    await expect(page.getByTestId("apollo-haunch-datum")).toContainText("Step 4-C");
    await expect(page.getByTestId("apollo-wf-authorization-summary")).toContainText("正式認可なし");

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "e2e-s4b-007-scope-guard.png"),
      fullPage: true,
    });
  });
});
