import { expect, test } from "@playwright/test";

test("shows the revised six-stage flow after removing output targets", async ({ page }) => {
  await page.goto("/th/run");
  await expect(page.getByRole("dialog", { name: "時刻歴応答解析" })).toBeVisible();
  await expect(page.locator(".time-history-wizard-sidenav button")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /出力対象選択/ })).toHaveCount(0);
});

test("redirects the removed output target route with HTTP 301", async ({ request }) => {
  const response = await request.get("/th/output-targets", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe("/th/run");
});

test("input check keeps model, support, and mass cards read-only", async ({ page }) => {
  await page.goto("/th/run");
  await page.locator(".time-history-wizard-sidenav button", { hasText: "入力チェック" }).click();
  for (const label of ["モデル定義", "支点条件", "質量設定"]) {
    const card = page.locator(".time-history-check-card", { hasText: label });
    await expect(card).toContainText("前段画面で確定済み");
    await expect(card.getByRole("button")).toHaveCount(0);
  }
});

test("chart renders micro displacement and acceleration on independent auto-scaled axes", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/time-history.html");
  await expect(page.getByTestId("time-history-chart")).toBeVisible();
  await page.getByLabel("物理量").getByText("加速度").click();
  await expect(page.locator(".recharts-line-curve")).toHaveCount(3);
  await expect(page.getByText("G3_ux / 変位")).toBeVisible();
  await expect(page.getByText("G2_ux / 加速度")).toBeVisible();
});

test("3D animation supports playback and seeking", async ({ page }) => {
  await page.goto("/tests/e2e/fixtures/time-history.html");
  const seek = page.getByLabel("再生位置");
  await expect(page.locator(".time-history-animation-canvas canvas")).toBeVisible();
  await seek.fill("40");
  await expect(page.getByText(/現在時刻: 0.400 s/)).toBeVisible();
  await page.getByRole("button", { name: "再生" }).click();
  await page.waitForTimeout(150);
  expect(Number(await seek.inputValue())).toBeGreaterThan(40);
  await page.getByRole("button", { name: "一時停止" }).click();
});
