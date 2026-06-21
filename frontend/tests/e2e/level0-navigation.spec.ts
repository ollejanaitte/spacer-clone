import { expect, test } from "@playwright/test";

test.describe("level0 navigation", () => {
  test("sample cards update both URL and screen", async ({ page }) => {
    const cases = [
      { name: "短い橋", sample: "short" },
      { name: "標準的な橋", sample: "standard" },
      { name: "高い橋脚の橋", sample: "tall" },
    ];

    for (const sample of cases) {
      await page.goto("/level0");
      await page.getByRole("button", { name: new RegExp(sample.name) }).click();
      await expect(page).toHaveURL(`/level0?sample=${sample.sample}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(sample.name);
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

  test("professional link opens pro mode without a React page error", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/level0");
    await page.getByRole("button", { name: "実務編で詳しく見る" }).click();
    await expect(page).toHaveURL("/pro");
    await expect(page.getByText("5-Span Continuous Viaduct (Plan A)")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
