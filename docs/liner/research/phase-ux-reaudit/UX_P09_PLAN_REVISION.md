# UX-REAUDIT P09 — Step2 / Step3 Implementation Plan Revision（凍結）

Status: FROZEN（Step1 計画の模式図/UI要件込み改訂版）

## 1. Purpose
Step1 STEP1_P07_STEP2_PLAN.md（S2-P00〜P17）に、
「模式図つき入力UI/UX」要件（UX-P01〜P08）を織り込み、Step2/Step3 の
実装順序・PR分割・責務・acceptance criteria を全面改訂する。

backend 本格実装（Step2）と UI 結合（Step3）の境界を明確にする。

## 2. 原則（変更）
- Step2: backend 計算 + 模式図が消費するデータ契約（ペイロード）を完成させる。
  UI 本実装は Step3 だが、**模式図用のデータ整形関数**（backend または frontend core）は
  Step2 で確定し、Step3 が迷わず描画できるようにする。
- Step3: 模式図 UI（SVG/Canvas/Three.js）・ライブプレビュー・ナビゲーション・E2E を実装。

## 3. Step 2 改訂計画（backend 計算 + 模式図データ契約）

```
S2-UX00  Preflight / UX要件の実装可否最終確認
  │
S2-UX01  backend/rule_engine/vertical/         [UX-P02 のデータ供給]
  │
S2-UX02  Rule: X2-R-020 widening               [UX-P03]
S2-UX03  Rule: X2-R-021 curve-length           [UX-P03]
S2-UX04  Rule: X2-R-022 superelevation transition [UX-P03]
S2-UX05  Rule: X2-R-023 clearance              [UX-P03]
S2-UX06  Rule→RoadGeometry adapter             [UX-P03]
  │
S2-UX07  bridge_geometry Pier                  [UX-P04]
S2-UX08  bridge_geometry Span                  [UX-P04]
S2-UX09  bridge_geometry Girder/Node           [UX-P04]
S2-UX10  node distance/overhang/skew           [UX-P04]
  │
S2-UX11  output format.py                      [UX-P05]
S2-UX12  output tables.py                      [UX-P05]
S2-UX13  output reports.py/dxf.py              [UX-P05]
  │
S2-UX14  geometry3d payload                    [UX-P05 3D / Step3 入力]
  │
S2-UX15  replay fixtures GM-01〜GM-05          [UX-P05 O-REPLAY]
S2-UX16  replay_runner + pytest                [UX-P05 O-REPLAY]
  │
S2-UX17  DIAGRAM DATA CONTRACT
         - 各模式図が消費するペイロード型（frontend互換JSON）を確定
         - UX-P01〜P05 の図が消費するフィールドを全て公開
         - frontend LinerDraft ↔ backend 計算のマッピング確定
  │
S2-UX18  Step2 final verification / gate
```

### S2-UX17（模式図データ契約）が Step2 の要
- 模式図が「何を描くか」は UX-P01〜P05 で凍結済み
- Step2 はその描画に必要な**最小データペイロード**を確定する
  - PLAN 図用: 要素境界・主要点・道路端・pier/girder/node 座標
  - PROFILE 図用: station→Z/grade/VPI/VCL
  - SECTION 図用: width/crossfall/pivot/edge/section height
- ペイロードは frontend 既存 core の型（CanonicalLinerIntermediateResult 等）と互換

## 4. Step 3 改訂計画（UI 結合・E2E）

```
S3-UX01  模式図コンポーネント基盤（SVG 共通ライブラリ: 座標→SVG、選択/ハイライト状態）
S3-UX02  H-ALIGN 画面（UX-P01）実装
S3-UX03  V-PROF 画面（UX-P02）実装
S3-UX04  X-SECT 画面（UX-P03）実装
S3-UX05  B-BRIDGE 画面（UX-P04）実装
S3-UX06  O-OUTPUT / O-REPLAY 画面（UX-P05）実装
S3-UX07  LIVE PREVIEW 共通（UX-P06）実装（3状態・debounce・LOD）
S3-UX08  ナビゲーション/レイアウト/レスポンシブ/ヘルプ（UX-P07）実装
S3-UX09  3D 表示（Step2 geometry3d payload を Three.js で描画）
S3-UX10  E2E（ユーザー操作導線①〜⑥ 完走検証）
S3-UX11  最終 UI 結合 verification / gate
```

## 5. 責務・依存関係
- Step2 完了条件に S2-UX17（模式図データ契約）を含める
- Step3 は Step2 のペイロード + LinerDraft のみで着手可能（backend 実装待ち不要）
- backend 数値は既存コア委譲（重複実装なし）
- 模式図は「描画入力」であり、数値正本ではない（UX-P06 と整合）

## 6. Acceptance Criteria（Step2 改訂版）
- Step1 P07 の全 criteria に加え:
  - [ ] 全模式図（PLAN/PROFILE/SECTION/MIXED）が消費するデータペイロードが確定・公開
  - [ ] frontend LinerDraft ↔ backend 計算のマッピング表が確定
  - [ ] エラーコード連携表（backend ↔ LINER_DIAGNOSTIC_CODES）が確定
  - [ ] 既存 X4-D に退行なし
  - [ ] 全 PR を research/liner-r1-planning へ段階 merge

## 7. Acceptance Criteria（Step3）
- [ ] 各画面の模式図が UX-P01〜P05 の仕様通り表示・双方向連動
- [ ] LIVE PREVIEW 3状態（INPUT/VALIDATED/CALCULATED）が機能
- [ ] ナビゲーション①〜⑥完走
- [ ] レスポンシブ（3/2/1 ペイン）・色覚対応・ヘルプ
- [ ] 3D 表示（Step2 payload → Three.js）
- [ ] E2E テスト通過

## 8. Traceability
- Step1 STEP1_P07_STEP2_PLAN.md（改訂元）
- UX-P01〜P08（本 Phase）
