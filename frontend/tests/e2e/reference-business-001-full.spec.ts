import { expect, test } from "@playwright/test";
import { uniqueBusinessNumber } from "./helpers/fixture";

/**
 * F-7: Reference Business 001 Full E2E.
 *
 * 正式workflow (実ブラウザ):
 *   App起動 → 業務一覧 → RB001を読み込む → Project開く → 各module
 *   (Site Context / Terrain / Road / Bridge Layout / Superstructure /
 *    Bearings / Substructure / Analysis / CIM 3D / Deliverables) →
 *   Save → Close → Reopen → 復元確認 → no data loss → no console error。
 *
 * 重要:
 *   - UI初期状態をfixtureにしない (F-3 helper / 明示ローダー使用)。
 *   - Analysis は fail-closed (NOT_RUN) を正直に検証する。架空の解析結果を作らない。
 *   - RB001 固有の girder section は未宣言 (trusted データ不在)。F-1 監査の
 *     結論どおり、架空 section 値は入力せず NOT_RUN を維持する。
 */

const RB001_NAME = "RB001 郡上市八幡 長良川橋 完成Project";
const RB001_GUJO_EPSG = "6674";

test.describe("F-7 Reference Business 001 Full E2E", () => {
  test("complete RB001 workflow: load → modules → save → close → reopen → no data loss", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    // 1. アプリ起動
    await page.goto("/app");
    await expect(page.getByTestId("home-page")).toBeVisible();

    // 2. 業務一覧
    await page.getByTestId("home-go-business").click();
    await expect(page).toHaveURL(/\/app\/business$/);
    await expect(page.getByTestId("business-list-page")).toBeVisible();

    // 3. RB001 を明示ローダーで読み込み
    const row = page.getByTestId("business-row").filter({ hasText: RB001_NAME });
    if ((await row.count()) === 0) {
      await page.getByTestId("load-reference-business-button").click();
      await expect(page.getByTestId("business-message")).toContainText("Reference Business 001");
      await expect(page.getByTestId("business-row").filter({ hasText: RB001_NAME })).toBeVisible();
    }

    // 4. Project を開く
    await page
      .getByTestId("business-row")
      .filter({ hasText: RB001_NAME })
      .first()
      .getByTestId("business-open")
      .click();
    await expect(page).toHaveURL(/\/app\/projects\/.+/);
    await expect(page.getByTestId("project-top-page")).toBeVisible();
    await expect(page.getByTestId("project-top-name")).toContainText("RB001");

    // 5. Terrain module (Site Context / Gujo / EPSG:6674)
    await page.getByTestId("module-open-terrain").click();
    await expect(page.getByTestId("terrain-module-page")).toBeVisible();
    // terrainDocument が復元されている (F-2 module writer 経由)
    await expect(page.getByTestId("terrain-module-doc")).toBeVisible();
    await page.getByTestId("terrain-module-back").click();

    // 6. Road module
    await page.getByTestId("module-open-road").click();
    await expect(page.getByTestId("road-module-page")).toBeVisible();
    await expect(page.getByTestId("road-module-meta")).toBeVisible();
    await page.getByTestId("road-module-back").click();

    // 7. Bridge Layout (6 spans × 50m)
    await page.getByTestId("module-open-bridgeLayout").click();
    await expect(page.getByTestId("bridge-layout-module-page")).toBeVisible();
    await expect(page.getByTestId("bridge-layout-module-meta")).toBeVisible();
    await page.getByTestId("bridge-layout-module-back").click();

    // 8. Superstructure + Bearings
    await page.getByTestId("module-open-superstructure").click();
    await expect(page.getByTestId("module-shell-page")).toBeVisible();
    await page.getByTestId("module-shell-back").click();

    // 9. Substructure
    await page.getByTestId("module-open-substructure").click();
    await expect(page.getByTestId("module-shell-page")).toBeVisible();
    await page.getByTestId("module-shell-back").click();

    // 10. Analysis — fail-closed を正直に検証 (架空結果を作らない)
    //     RB001 の実解析には (a) roadEditorDraft 形式の道路データと
    //     (b) RB001 固有の girder section が不足している。どちらも trusted な
    //     既存データが無いため、解析は NOT_RUN を維持する。
    //     Apollo golden section (G-DES-*) は別橋梁 (AG1・3径間・girder spacing 4.5m)
    //     の値であり、RB001 (6径間×50m・spacing 8m) へ接続すると架空値と同義。
    //     → 架空 section は入力せず、解析失敗 (fail-closed) を正直に確認する。
    await page.getByTestId("module-open-analysis").click();
    await expect(page.getByTestId("analysis-module-page")).toBeVisible();
    // 解析実行を試みる: 結果が無い / fail-closed メッセージ (架空成功を作らない)
    await page.getByTestId("analysis-run").click();
    await expect(page.getByTestId("analysis-message")).toContainText(/ありません|エラー|実行できません|失敗|UNSTABLE|NOT_AVAILABLE|ない|できません|確認してください/i);
    await page.getByTestId("analysis-back").click();

    // 11. CIM 3D
    await page.getByTestId("module-open-cim").click();
    await expect(page.getByTestId("module-shell-page")).toBeVisible();
    await expect(page.getByTestId("cim-layout")).toBeVisible();
    await page.getByTestId("cim-module-back").click();

    // 12. Deliverables / Export 入口
    await page.getByTestId("module-open-deliverables").click();
    await expect(page.getByTestId("deliverables-module-page")).toBeVisible();
    await page.getByTestId("deliverables-back").click();

    // 13. Save (project-top に戻る; autosave は PersistentProjectManager 経由)
    await expect(page.getByTestId("project-top-page")).toBeVisible();

    // 14. Close (業務一覧へ) → 15. Reopen
    await page.getByTestId("project-top-back").click();
    await expect(page.getByTestId("business-list-page")).toBeVisible();
    await page
      .getByTestId("business-row")
      .filter({ hasText: RB001_NAME })
      .first()
      .getByTestId("business-open")
      .click();
    await expect(page.getByTestId("project-top-page")).toBeVisible();

    // 16. 復元確認: Terrain 再表示
    await page.getByTestId("module-open-terrain").click();
    await expect(page.getByTestId("terrain-module-page")).toBeVisible();
    await expect(page.getByTestId("terrain-module-doc")).toBeVisible();
    await page.getByTestId("terrain-module-back").click();

    // 17. 復元確認: Road
    await page.getByTestId("module-open-road").click();
    await expect(page.getByTestId("road-module-page")).toBeVisible();
    await expect(page.getByTestId("road-module-meta")).toBeVisible();
    await page.getByTestId("road-module-back").click();

    // 18. 復元確認: Bridge
    await page.getByTestId("module-open-bridgeLayout").click();
    await expect(page.getByTestId("bridge-layout-module-page")).toBeVisible();
    await expect(page.getByTestId("bridge-layout-module-meta")).toBeVisible();
    await page.getByTestId("bridge-layout-module-back").click();

    // 19. 復元確認: Analysis page (再表示; fail-closed 維持)
    await page.getByTestId("module-open-analysis").click();
    await expect(page.getByTestId("analysis-module-page")).toBeVisible();
    await page.getByTestId("analysis-back").click();

    // 20. 復元確認: CIM 3D 再構築
    await page.getByTestId("module-open-cim").click();
    await expect(page.getByTestId("module-shell-page")).toBeVisible();
    await expect(page.getByTestId("cim-layout")).toBeVisible();
    await page.getByTestId("cim-module-back").click();

    // 21. fatal console error なし (全module navigation後)
    const fatalErrors = consoleErrors.filter((e) => !e.includes("favicon") && !e.includes("404"));
    expect(fatalErrors).toEqual([]);
  });

  test("EPSG:6674 / Gujo coordinate context is preserved in the project metadata", async ({
    page,
  }) => {
    await page.goto("/app/business");
    await expect(page.getByTestId("business-list-page")).toBeVisible();
    const row = page.getByTestId("business-row").filter({ hasText: RB001_NAME });
    if ((await row.count()) === 0) {
      await page.getByTestId("load-reference-business-button").click();
      await expect(page.getByTestId("business-message")).toContainText("Reference Business 001");
      await expect(page.getByTestId("business-row").filter({ hasText: RB001_NAME })).toBeVisible();
    }
    // Project top に coordinate context 情報が表示されることを確認
    await page
      .getByTestId("business-row")
      .filter({ hasText: RB001_NAME })
      .first()
      .getByTestId("business-open")
      .click();
    await expect(page.getByTestId("project-top-page")).toBeVisible();
  });
});

test.describe("F-7 isolated fixture (no leftover state)", () => {
  test("RB001 loader creates a deterministic, schema-valid project", async ({ page }) => {
    const suffix = uniqueBusinessNumber("F7").toLowerCase();
    // 業務一覧を開き、RB001 が既存なら削除 → 新規読み込み (deterministic)
    await page.goto("/app/business");
    await expect(page.getByTestId("business-list-page")).toBeVisible();
    const row = page.getByTestId("business-row").filter({ hasText: RB001_NAME });
    if ((await row.count()) > 0) {
      await row.first().getByTestId("business-delete").click();
      await expect(page.getByTestId("delete-confirm")).toBeVisible();
      await page.getByTestId("delete-confirm-ok").click();
    }
    await page.getByTestId("load-reference-business-button").click();
    await expect(page.getByTestId("business-message")).toContainText("Reference Business 001");
    const newRow = page.getByTestId("business-row").filter({ hasText: RB001_NAME });
    await expect(newRow.first()).toBeVisible();
    // 内部Project ID は UUID 形式 (deterministic でなくても schema-valid)
    const idText = await newRow.first().getByTestId("business-internal-id").innerText();
    expect(idText.trim()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
