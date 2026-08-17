import { expect, test } from "@playwright/test";

test.describe("level0 navigation", () => {
  test("sample cards select a sample and show the parameter panel", async ({ page }) => {
    const cases = [
      { name: "短い橋", sample: "short" },
      { name: "標準的な橋", sample: "standard" },
      { name: "高い橋脚の橋", sample: "tall" },
    ];

    await page.goto("/level0");
    for (const sample of cases) {
      await page.getByRole("button", { name: new RegExp(sample.name) }).click();
      // 現行仕様: サンプルカードはURLを変更せず、パラメータパネルを表示する。
      await expect(page.getByRole("button", { name: "計算" })).toBeVisible();
    }
  });

  test("lesson navigation, detail card, and back buttons update the screen", async ({ page }) => {
    await page.goto("/level0");
    await page.getByRole("button", { name: /教材モード/ }).click();
    await expect(page).toHaveURL("/level0/lesson");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("教材モード");

    await page.getByRole("button", { name: /橋はなぜ支えられるのか/ }).click();
    await expect(page).toHaveURL("/level0/lesson/why-bridge-stands");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("橋はなぜ支えられるのか");

    await page.getByRole("button", { name: "教材一覧に戻る" }).click();
    await expect(page).toHaveURL("/level0/lesson");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("教材モード");

    await page.getByRole("button", { name: "入門編に戻る" }).click();
    await expect(page).toHaveURL("/level0");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("入門編");
  });

  test("professional link opens the canonical /app business list without a React page error", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/level0");
    await page.getByRole("button", { name: "実務編で詳しく見る" }).click();
    // G-5 現行仕様: 実務編は canonical /app (NextApp) の業務一覧へ導く。
    await expect(page).toHaveURL(/\/app\/business$/);
    await expect(page.getByTestId("business-list-page")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
