import { expect, test } from "@playwright/test";
import {
  uniqueBusinessNumber,
  createProjectViaUi,
  openProjectViaUi,
  deleteProjectViaUi,
} from "./helpers/fixture";

/**
 * F-3: E2E fixture standardization — 明示 fixture の成立確認。
 *
 * 正式ルール: 「画面初期状態をE2E fixture代わりにしない」。
 * 各テストは fixture helper 経由で明示 Project を作成し、
 * 前テスト残骸・onboarding 表示・localStorage 手作業に依存しない。
 * テスト終了時は作成した Project を削除する (cleanup)。
 */
test.describe("F-3 E2E fixture standardization", () => {
  test("create → open → delete: 明示 fixture Project の lifecycle", async ({ page }) => {
    const fixture = {
      businessNumber: uniqueBusinessNumber("F3FIX"),
      name: "F-3 fixture 検証業務",
      designStage: "bridge-detailed",
    };

    // 1. 明示 fixture で新規 Project 作成 (UI初期状態に依存しない)
    await createProjectViaUi(page, fixture);

    // 2. 業務一覧に fixture が表示される
    await expect(page.getByText(fixture.name, { exact: false }).first()).toBeVisible();

    // 3. 明示オープン → Project top 表示 + projectId は UUID
    const opened = await openProjectViaUi(page, fixture);
    expect(opened.projectId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // 4. cleanup: 削除 → 一覧から消える
    await deleteProjectViaUi(page, fixture.businessNumber);
  });

  test("同一 fixture 名で独立した Project が作成できる (test 間 state 漏洩防止)", async ({ page }) => {
    const fixtureA = {
      businessNumber: uniqueBusinessNumber("F3ISO"),
      name: "F-3 isolation A",
      designStage: "road-preliminary",
    };
    const fixtureB = {
      businessNumber: uniqueBusinessNumber("F3ISO"),
      name: "F-3 isolation B",
      designStage: "road-preliminary",
    };

    await createProjectViaUi(page, fixtureA);
    await openProjectViaUi(page, fixtureA);
    await page.getByTestId("nav-business-list").click();
    await expect(page).toHaveURL(/\/app\/business$/);
    const rowA = page.getByTestId("business-row").filter({ hasText: fixtureA.businessNumber });
    await expect(rowA.first()).toBeVisible();
    // B はまだ存在しない (前テスト残骸に依存しない)
    const rowB = page.getByTestId("business-row").filter({ hasText: fixtureB.businessNumber });
    await expect(rowB).toHaveCount(0);

    await createProjectViaUi(page, fixtureB);
    await openProjectViaUi(page, fixtureB);

    await deleteProjectViaUi(page, fixtureA.businessNumber);
    await deleteProjectViaUi(page, fixtureB.businessNumber);
  });
});
