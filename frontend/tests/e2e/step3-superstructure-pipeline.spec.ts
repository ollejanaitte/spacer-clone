import { expect, test } from "@playwright/test";

/**
 * STEP 3 — RB-001 Project Replay through the superstructure pipeline UI.
 * E2E-S3-001: fixture -> Geometry -> 3D -> Design -> Replay -> Analysis (backend)
 * E2E-S3-002: output (quantity CSV) without dead-end
 */

async function openPipeline(page: import("@playwright/test").Page) {
  await page.goto("/pro/apollo");
  await page.getByTestId("apollo-start-screen").getByRole("button", { name: "新規作成" }).click();
  await expect(page.getByTestId("apollo-basics-screen")).toBeVisible();
  await page.getByTestId("apollo-open-superstructure-pipeline").click();
  await expect(page.getByTestId("apollo-superstructure-pipeline")).toBeVisible();
}

test.describe("STEP 3 RB-001 superstructure pipeline", () => {
  test("E2E-S3-001: RB-001 replay Geometry -> 3D -> Design -> Replay -> Analysis", async ({ page }) => {
    await openPipeline(page);

    // Geometry generation (golden-derived snapshot)
    await page.getByTestId("pipeline-geometry").getByRole("button").click();
    await expect(page.getByTestId("pipeline-geometry").locator(".pipeline-ok")).toContainText("supports=4");
    await expect(page.getByTestId("pipeline-geometry").locator(".pipeline-ok")).toContainText("hold=50");
    await expect(page.getByTestId("pipeline-geometry").locator(".pipeline-ok")).toContainText("fingerprint=fnv1a32:");

    // 3D model generation
    await page.getByTestId("pipeline-3d").getByRole("button").click();
    await expect(page.getByTestId("pipeline-solid-count")).toContainText("solid=15");

    // Design (NOT_AUTHORIZED gate shown)
    await page.getByTestId("pipeline-design").getByRole("button").click();
    await expect(page.getByTestId("pipeline-design").locator(".pipeline-ok")).toContainText("PENDING_AUTHORIZATION");
    await expect(page.getByTestId("pipeline-design").locator(".pipeline-ok")).toContainText("NOT_GRANTED");

    // Replay (golden parity through UI)
    await page.getByTestId("pipeline-replay").getByRole("button").click();
    await expect(page.getByTestId("pipeline-replay").locator(".pipeline-ok")).toContainText("verdict=PASS");

    // Analysis via backend /api/design/analyze (existing solver)
    await page.getByTestId("pipeline-analysis").getByRole("button").click();
    await expect(page.getByTestId("pipeline-analysis").locator(".pipeline-ok")).toContainText("authorization=NOT_GRANTED");
  });

  test("E2E-S3-002: authorization banner is visible (NOT_AUTHORIZED state preserved)", async ({ page }) => {
    await openPipeline(page);
    await expect(page.getByTestId("apollo-authorization-banner-l1")).toContainText("開発確認用・未検証");
    await expect(page.getByTestId("apollo-authorization-banner-l1")).toContainText("正式認可なし");
    await expect(page.getByTestId("apollo-authorization-banner-l2")).toContainText("数値設計の正式認可は付与されていない");
  });
});
