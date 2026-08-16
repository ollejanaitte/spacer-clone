import { expect, type Page } from "@playwright/test";

/**
 * SPACER CLONE E2E 共通 helper。
 *
 * /pro は b020b4d 以降、5-Span Continuous Viaduct (Plan A) の自動初期化を
 * 廃止し、空モデル (モデル未作成) で起動する。旧 spec の「5-Span 見出し待ち」は
 * 現行の「Toolbar の LINER 導線が利用可能になる」までを待つ形へ統一する。
 */

/** /pro を開き、LINER 導線 (Toolbar) が利用可能になるまで待つ。 */
export async function openProAndWait(page: Page): Promise<void> {
  await page.goto("/pro");
  await expect(page.getByTestId("open-liner-list")).toBeVisible({ timeout: 60000 });
}

/** Toolbar の LINER 一覧ボタンから /pro/liner へ進む。 */
export async function openLinerList(page: Page): Promise<void> {
  await page.getByTestId("open-liner-list").click();
  await expect(page).toHaveURL("/pro/liner");
  await expect(page.getByTestId("liner-list-page")).toBeVisible();
}

/** LINER 新規作成 → ランチャーを開き、指定モード (gui / sample) へ進む。 */
export async function openLinerLauncher(page: Page, mode: "gui" | "sample"): Promise<void> {
  await page.getByTestId("create-liner").click();
  await expect(page.getByTestId("liner-launcher-page")).toBeVisible();
  await page.getByTestId(`liner-launcher-${mode}`).click();
}
