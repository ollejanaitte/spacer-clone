# Master Pre-Decision Document - Phase3.5 実装事前判断記録書

> 📅 作成日: 2026年6月29日
> 🎯 用途: Phase3.5 Batch 1〜5 全期間の判断基準。Codex はこの文書を「正」として参照する。
> 👤 承認者: 織田 雅春
> 🔗 関連: N1〜N7, 既存16 Human Decisions

---

## 0. このドキュメントの位置づけ

このドキュメントは、Phase3.5（LINER線形計算機能）実装期間中に発生し得る判断項目について、
**事前にすべて確定**したものを記録する。

- Codex（および将来の実装者）は、迷ったらこの文書を優先する
- 設計書 N1〜N7 とこの文書に矛盾があれば、**この文書を優先**
- このドキュメント自体の変更は織田さんの明示承認が必要

---

## 1. Pre-Decision #1: Clothoid 精度 Spike 判定ルール

### 確定方針
- **Simpson積分継続条件**: 位置誤差 **1mm 以下**
- **Fresnel関数移行条件**: 位置誤差が 1mm を超える場合
- 判定対象: PR-1b-0 (Clothoid Precision Spike) の実測結果

### 関連
- 既存 Decision #2 (Target Accuracy 方式) の具体化
- N1 §クロソイド精度
- N7 PR-1b-0, PR-1b-5

### Codex への指示
- PR-1b-0 完了時に Spike 結果を完了報告に含める
- Spike 結果が判定基準を満たす場合: PR-1b-5 で Simpson 維持実装
- 満たさない場合: **PR-1b-5 を停止し織田さんに報告**（Fresnel 移行は別 Phase）

---

## 2. Pre-Decision #2: parabolic 縦断要素フィールド構成

### 確定方針
**JIP-LINER 互換方式**を採用。

### フィールド構成
```typescript
interface VerticalParabolicElementDraft {
  type: "parabolic";
  id: string;
  startStation: number;      // 開始測点 (m)
  endStation: number;        // 終了測点 (m)
  startGrade: number;        // 開始勾配 (%, 上り正)
  endGrade: number;          // 終了勾配 (%, 上り正)
  length: number;            // 曲線長 (m)
  startElevation?: number;   // 開始標高 (m, optional, 計算可能)
  curveType?: "crest" | "sag"; // optional, 計算で導出可能
}
```

### 関連
- N3 縦断線形設計
- PR-1a-1 補遺ドキュメント (typed_liner_draft_schema_vnext_addendum_pr1a1.md)

### Codex への指示
- PR-1a-2 (JSON Schema) で上記スキーマを確定
- PR-2a-1〜2a-5 で型・UI を完成
- K値方式・半径R方式は**採用しない**

---

## 3. Pre-Decision #3: 横断勾配の符号規約

### 確定方針
**道路センターから見て右下がりを正（+）**。

### 詳細
- 進行方向を基準に、センターから右側に向かって下る勾配を **正値（+）**
- 進行方向を基準に、センターから左側に向かって下る勾配を **負値（-）**
- 単位: パーセント（%）
- 例: `crossSlope: 2.0` = 右に 2% 下る片勾配

### 関連
- 既存 Decision #7 (横断勾配・superelevation 符号確定) の具体化
- N4 横断・superelevation 設計
- N7 Phase3.5-3 全般

### Codex への指示
- PR-3a-1〜3a-5, PR-3b-1〜3b-4 で本符号規約を厳守
- localFrame 反映は Phase3.5-4 (Decision #7)、本 Phase ではスカラ値のみ保持

---

## 4. Pre-Decision #4: 横断テンプレート定義方式

### 確定方針
**オフセット線リスト方式**を採用。

### データ構造
```typescript
interface CrossSectionTemplateDraft {
  id: string;
  name: string;
  offsetLines: CrossSectionOffsetLineDraft[];
}

interface CrossSectionOffsetLineDraft {
  id: string;
  offset: number;       // 中心線からのオフセット (m, 右正)
  elevation: number;    // 相対標高 (m, 上正)
  role?: "shoulder" | "lane" | "median" | "sidewalk" | "edge" | "custom";
  label?: string;
}
```

### 関連
- N4 横断・superelevation 設計
- PR-1a-1 で既に保守的定義済み (CrossSectionOffsetLineDraft)

### Codex への指示
- レイヤー方式・パラメトリック方式は**採用しない**
- PR-3a-1 でテンプレート Domain 定義を確定
- PR-3a-3 でテンプレートエディタ UI 実装

---

## 5. Pre-Decision #5: Tab Framework UI 実装方針

### 確定方針
**既存プロジェクト (`spacer-clone`) の UI 慣習に合わせる**。

### 実装ルール
- PR-UI-0 着手時、Codex はまず以下を調査:
  1. `frontend/src/` 配下の既存 Tab 系コンポーネント有無
  2. 既存 UI ライブラリ依存 (`package.json`)
  3. 既存ページのレイアウトパターン (`LinerEditPage` 等)
- 既存に Tab 実装があればそれを再利用・拡張
- 既存に無ければ、**新規依存追加せず**、軽量な自作 Tab コンポーネントで実装
- Radix UI 等の新規ライブラリ追加は**禁止**

### Codex への指示
- PR-UI-0 で調査結果を完了報告に明記
- 採用した実装方針の根拠を補遺ドキュメントに記録

---

## 6. Pre-Decision #6: エラー時の停止ポリシー

### 確定方針
**該当バッチで停止、織田さんに報告**。

### 詳細ルール
1. Codex / Cursor CLI は各 PR の実装後、`npm run typecheck` `npm run lint` `npm run test` を **実行しない**（ローカル検証は織田さんが担当）
2. ただし TypeScript の型エラーをコード生成中に検知した場合は即停止
3. PR 単位で commit を分け、エラー時にロールバック可能にする
4. バッチ内の PR-N でエラー発生 → PR-(N+1) 以降は**着手しない**
5. 停止時は完了報告に「停止理由」「エラー全文」「ロールバック可能 commit」を明記

### Codex への指示
- 自動リトライ禁止
- エラー無視禁止
- 「とりあえず動くもの」での妥協禁止
- 停止判断は積極的に行う（疑わしきは止める）

---

## 7. 既存 16 Human Decisions との関係

| Decision# | 内容 | この文書での扱い |
|---|---|---|
| #1 | DXF曲線出力 (polyline近似) | 維持 |
| #2 | Clothoid 精度 (Target Accuracy) | **Pre-Decision #1 で具体化** |
| #3 | UI構成 (タブ分割) | Pre-Decision #5 で実装方針具体化 |
| #4 | Draft Migration (v0.1 固定) | 維持 |
| #5 | Project 保存 (`liner.draftSchemaVersion`) | 維持 |
| #6 | Frame Model (細分化 member) | 維持 |
| #7 | 横断勾配符号 | **Pre-Decision #3 で具体化** |
| #8 | 単一 alignment | 維持 |
| #9 | Sampling (Display 0.5m / DXF 0.1m / Frame 0.25m) | 維持・厳守 |
| #10 | Diagnostic Severity | 維持 |
| #11 | Feature Flag 不採用 | 維持 |
| #12 | Schema 命名 `liner.draftSchemaVersion` | 維持 |
| #13 | Tab Framework 先行 | 維持 |
| #14 | Simpson 精度 + Spike | **Pre-Decision #1 で具体化** |
| #15 | Frame Sampling 0.25m 厳守 | 維持 |
| #16 | Migration Test Round-trip 3種 | 維持 |

---

## 8. 申し送り（PR-1a-1 補遺からの継続事項）

| 項目 | 内容 | 対応 PR |
|---|---|---|
| FrameSamplingProfileDraft 命名整合 | `maxMemberLength` vs N1「max chord 0.25m」 | **PR-1a-2 で必ず確認** |
| parabolic 縦断要素 field set | Pre-Decision #2 で確定済 | PR-1a-2, PR-2a-1 |
| 横断 Z 合成関連フィールド | N4 実装前に再確認 | PR-3a-1, PR-3b-1 |
| Grid 定義と Sampling Frame 責務境界 | 役割分担を明確化 | PR-1a-2, PR-2b-2 |

---

## 9. このドキュメントの変更ルール

- 変更には織田さんの明示承認が必須
- 変更時は変更履歴セクションを追記
- Codex / Cursor CLI 自身による変更は**禁止**

### 変更履歴
- 2026-06-29: 初版作成（織田さん承認、6項目確定）
- 2026-06-29: v2 改訂（Cursor CLI 連携運用ルール追加）

---

## 10. Codex への基本指示

このドキュメントを最優先で参照し、各バッチ実装中に以下を厳守してください：

1. **疑わしきは停止**：判断項目に該当する事項で迷ったら停止
2. **設計書順位**: このドキュメント > N7 > N1〜N6 > 既存コード
3. **追加判断項目の発見時**: 即停止し、織田さんに報告
4. **補遺の作成**: 各 PR で判断が必要だった事項は補遺ドキュメントに記録
5. **PR 単位 commit/push**: 1 PR = 最低 1 commit、各 PR 完了時に origin へ push

---

## 11. Cursor CLI への適用ルール（v2 追加）

### 11.1 役割分担再掲

| 役割 | 担当 |
|---|---|
| 現場監督・親分 | Codex (GPT-5.5) |
| 実装作業員 | Cursor CLI ヘッドレス |
| 補助 | Cursor IDE インライン補完 |
| 最終承認 | 織田さん |

### 11.2 コマンド組み立て原則
- **1 コマンド = 1 ファイル or 1 責務**
- **編集内容は完了条件で書く**（「○○ を追加し、フィールドは X, Y, Z」）
- **参照設計書を明記**（例: N2 §4 準拠）
- **禁止事項を明記**（例: 既存 Foo は変更禁止）
- **expected diff サイズを書ける場合は書く**

### 11.3 Cursor CLI 出力レビュー必須項目
- 意図しないファイルが変更されていないか（`git diff` で確認）
- 既存型・関数の削除や変更が無いか
- 文字コード・BOM・改行コード（UTF-8 BOM なし、LF）
- import の重複や未使用
- 型エラーの有無

### 11.4 Cursor CLI 暴走時の対処
- 該当ブランチで `git restore` / `git checkout HEAD -- <path>` で巻き戻し
- 再投入コマンドを禁止事項込みで再構築
- 3 回連続で意図と異なる出力なら**織田さんに報告し停止**

### 11.5 Cursor IDE インライン補完の扱い
- ヘッドレス出力の修正を織田さんが IDE で行う際の補助として利用可
- インライン補完は Master Pre-Decision Document を「知らない」ため、補完結果も **Codex がレビュー対象**とする
- インライン補完で生成された差分を commit する前に必ず Codex にレビュー依頼すること
