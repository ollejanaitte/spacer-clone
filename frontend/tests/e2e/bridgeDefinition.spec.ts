import { expect, test } from "@playwright/test";

test.describe("bridge definition pipeline", () => {
  test("bridge wizard can generate a model with the feature flag enabled", async ({ page }) => {
    await page.goto("/pro");
    await page.getByTestId("open-bridge-wizard").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator(".bw-sidebar li button").nth(5).click();
    await page.locator(".bw-step-gen .bw-actions button").first().click();
    await expect(page.locator(".bw-step-gen .bw-result")).toBeVisible();
  });
});
