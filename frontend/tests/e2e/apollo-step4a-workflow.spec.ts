import { expect, test } from "@playwright/test";

/**
 * Apollo Step 4-A workflow control screen E2E.
 * E2E-S4A-001 Initial / 002 Valid existing project / 003 STALE /
 * 004 BLOCKED / 005 A11y (not color-only).
 */

async function openWorkflowScreen(page: import("@playwright/test").Page) {
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible();
  await expect(page.getByTestId("apollo-workflow-control-screen")).toBeVisible();
}

test.describe("Apollo Step 4-A workflow control screen", () => {
  test("E2E-S4A-001: initial empty project shows registry order, stubs and recommendation", async ({ page }) => {
    await openWorkflowScreen(page);

    const ids = await page.getByTestId("apollo-wf-step-id").allTextContents();
    expect(ids).toEqual([
      "WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07",
      "WF-08", "WF-09", "WF-10", "WF-11", "WF-12", "WF-13", "WF-14", "WF-15",
    ]);

    await expect(page.getByTestId("apollo-wf-step-WF-01")).toHaveAttribute("data-status", "BLOCKED");
    await expect(page.getByTestId("apollo-wf-step-WF-02")).toHaveAttribute("data-status", "RECOMMENDED");
    await expect(page.getByTestId("apollo-wf-progress-recommended")).toContainText("WF-02");
    await expect(page.getByTestId("apollo-wf-authorization-summary")).toContainText("正式認可なし");
  });

  test("E2E-S4A-004: WF-06 remains PLANNED BLOCKED; WF-03/WF-05 are implemented and not capability-blocked", async ({ page }) => {
    await openWorkflowScreen(page);

    const wf06 = page.getByTestId("apollo-wf-step-WF-06");
    await expect(wf06).toHaveAttribute("data-status", "BLOCKED");
    await expect(wf06.getByTestId("apollo-wf-step-disabled-reason")).toContainText("先に必要な作業があります");
    await wf06.getByTestId("apollo-wf-step-WF-06-blocking-tech-toggle").click();
    await expect(wf06.getByTestId("apollo-wf-step-WF-06-blocking-tech-panel")).toContainText("WF_CAPABILITY_PLANNED");
    await expect(wf06.getByTestId("apollo-wf-step-primary")).toBeDisabled();

    for (const stepId of ["WF-03", "WF-05"]) {
      const card = page.getByTestId(`apollo-wf-step-${stepId}`);
      await expect(card).not.toHaveAttribute("data-status", "BLOCKED");
    }
  });

  test("E2E-S4A-002: valid existing project marks generated steps COMPLETE + NOT_AUTHORIZED", async ({ page }) => {
    await openWorkflowScreen(page);

    await page.getByTestId("apollo-bridge-structure-panel").getByRole("button", { name: "動作確認用サンプル値を入力" }).click();
    await page.getByTestId("apollo-generate-structure").click();
    // Step 4-B: WF-03/WF-05 gate downstream — decide explicit none before expecting WF-10+.
    await page.getByTestId("apollo-appurtenance-all-none").click();
    await page.getByTestId("apollo-haunch-all-none").click();
    await page.getByTestId("apollo-appurtenance-regenerate").click();

    for (const stepId of ["WF-02", "WF-03", "WF-04", "WF-05", "WF-10", "WF-12", "WF-14"]) {
      const card = page.getByTestId(`apollo-wf-step-${stepId}`);
      await expect(card, stepId).toHaveAttribute("data-status", "COMPLETE");
      await expect(card, stepId).toContainText("正式認可なし");
    }
  });

  test("E2E-S4A-003: mutating input makes dependent steps STALE with regeneration CTA", async ({ page }) => {
    await openWorkflowScreen(page);

    await page.getByTestId("apollo-bridge-structure-panel").getByRole("button", { name: "動作確認用サンプル値を入力" }).click();
    await page.getByTestId("apollo-generate-structure").click();

    const widthInput = page.getByTestId("apollo-bridge-input-width");
    await widthInput.fill("14");
    await widthInput.press("Enter");

    const wf02 = page.getByTestId("apollo-wf-step-WF-02");
    await expect(wf02).toHaveAttribute("data-status", "STALE");
    await expect(wf02).toContainText("要再計算");
    await expect(page.getByTestId("apollo-wf-progress-recommended")).toContainText("WF-02");
  });

  test("E2E-S4A-005: status is conveyed by text label, not color only", async ({ page }) => {
    await openWorkflowScreen(page);

    const wf01Badge = page.getByTestId("apollo-wf-step-WF-01").getByTestId("apollo-wf-status-blocked");
    await expect(wf01Badge).toHaveAttribute("aria-label", expect.stringContaining("先に必要な作業があります"));

    const recommendedBadge = page.getByTestId("apollo-wf-step-WF-02").getByTestId("apollo-wf-status-recommended");
    await expect(recommendedBadge).toHaveAttribute("aria-label", expect.stringContaining("推奨"));

    const diagnostics = page.getByTestId("apollo-wf-step-WF-01").getByTestId("apollo-wf-diagnostics");
    await expect(diagnostics).not.toBeNull();
  });
});
