import { expect, type Page } from "@playwright/test";

/**
 * F-3: E2E fixture standard — 明示 Project fixture 作成 helper。
 *
 * 正式ルール: 「画面初期状態をE2E fixture代わりにしない」。
 * 各テストは UI 操作前に、fixture helper で明示的に Project を作成する。
 * 前テストの Project 残骸・onboarding 表示状態・localStorage 手作業・
 * production DB には依存しない。
 *
 * 注意: `/app` (PDC) の persistence はブラウザ実行時は in-memory
 * (MemoryFileSystemGateway / IPC無し) のため、`page.goto` (full reload) は
 * 状態を失う。初期 `goto` の後は SPA 内ナビ (`nav-business-list` 等) で遷移する。
 */

/** PDC 新規 Project の fixture 入力 (UI から明示作成)。 */
export interface NewProjectFixture {
  readonly businessNumber: string;
  readonly name: string;
  readonly designStage: string;
}

export interface OpenedProject {
  readonly businessNumber: string;
  readonly name: string;
  readonly projectId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * 一意な businessNumber を生成する (テストごとに独立)。
 * `E2E-<timestamp>-<random>` 形式で、前テスト残骸と衝突しない。
 */
export function uniqueBusinessNumber(prefix = "E2E"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

/** 業務一覧 (SPA 内ナビ) へ移動する。 */
async function gotoBusinessList(page: Page): Promise<void> {
  await page.getByTestId("nav-business-list").click();
  await expect(page).toHaveURL(/\/app\/business$/);
  await expect(page.getByTestId("business-list-page")).toBeVisible();
}

/**
 * `/app/business/new` の UI 経由で新規 PDC Project を明示作成する。
 * 初期ロード後は SPA 内ナビで遷移する (full reload しない)。
 */
export async function createProjectViaUi(page: Page, fixture: NewProjectFixture): Promise<void> {
  await page.goto("/app/business");
  await expect(page.getByTestId("business-list-page")).toBeVisible();
  await page.getByTestId("new-project-button").click();
  await expect(page).toHaveURL(/\/app\/business\/new$/);
  await expect(page.getByTestId("new-project-page")).toBeVisible();
  await page.getByTestId("form-business-number").fill(fixture.businessNumber);
  await page.getByTestId("form-name").fill(fixture.name);
  await page.getByTestId("form-design-stage").selectOption(fixture.designStage);
  await page.getByTestId("form-submit").click();
  await expect(page).toHaveURL(/\/app\/business$/);
  await expect(page.getByTestId("business-list-page")).toBeVisible();
}

/**
 * 業務一覧から fixture Project を開き、Project top を表示する。
 * 同一テスト内で保存済みの Project を明示的に再オープンするために使う。
 */
export async function openProjectViaUi(
  page: Page,
  fixture: NewProjectFixture,
): Promise<OpenedProject> {
  await gotoBusinessList(page);
  const row = page.getByTestId("business-row").filter({ hasText: fixture.businessNumber });
  await expect(row.first()).toBeVisible();
  await row.first().getByTestId("business-open").click();
  await expect(page).toHaveURL(/\/app\/projects\/.+/);
  await expect(page.getByTestId("project-top-page")).toBeVisible();
  const url = page.url();
  const match = /\/app\/projects\/([0-9a-f-]+)/.exec(url);
  const projectId = match?.[1] ?? "";
  if (!UUID_RE.test(projectId)) {
    throw new Error(`F3-FIXTURE-OPEN-FAILED: projectId not a UUID from ${url}`);
  }
  return { businessNumber: fixture.businessNumber, name: fixture.name, projectId };
}

/**
 * 前テスト残骸を防ぐため、テスト終了時に fixture Project を削除する。
 * 業務一覧 → DeleteConfirm ダイアログから削除する。
 */
export async function deleteProjectViaUi(page: Page, businessNumber: string): Promise<void> {
  await gotoBusinessList(page);
  const row = page.getByTestId("business-row").filter({ hasText: businessNumber });
  if ((await row.count()) === 0) return;
  await row.first().getByTestId("business-delete").click();
  await expect(page.getByTestId("delete-confirm")).toBeVisible();
  await page.getByTestId("delete-confirm-ok").click();
  await expect(row).toHaveCount(0);
}
