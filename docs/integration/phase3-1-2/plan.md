# Phase 3-1/3-2 実装計画 — Alignment → BridgeProject → BridgeGeometry

> **Phase:** P0 (plan)
> **Baseline:** origin/main `a2889b4dfa3330165a20ab397cec992738bd5f2a`
> **Branch:** `integration/phase3-1-2-alignment-bridgegeometry`
> **Worktree:** `/tmp/opencode/phase3-1-2-alignment`

## 1. 目標

①道路線形の確定データを BridgeProject（CBDM）へ実際に流し、
そのデータから BridgeGeometry を数値的に決定論生成する。

- Phase 3-1: Liner domain → **BridgeProject.Alignment**（Alignment Adapter）
- Phase 3-2: BridgeProject.Alignment → **BridgeProject.BridgeGeometry**（数値生成）
- 両者を **CBDM 文書** に格納し、Save/Load/Replay で意味・値・status・source を保持。
- 山岳500m で E2E 決定論を検証。
- Phase 3-3（①→②binding）へ進める状態にする（Phase 3-3 本体は今回やらない）。

## 2. 再利用（新規 adapter 乱立防止）

| 既存資産 | 使い方 |
|----------|--------|
| `liner/core/coordinate3d.ts` `pointAtStationOffset` / `crossSectionAtStation` / `evaluateAlignmentAtDistance` | 測点→XYZ/azimuth/grade/crossfall/width の評価（**再実装しない**） |
| `contracts/runtime/schemas/commonBridgeDataModel.ts`（CBDM zod） | 格納先の正準スキーマ・構造検証 |
| `contracts/bridgeProject.ts`（manifest validator） | BridgeProject manifest の検証 |
| `contracts/legacy/idStability.ts` `deriveStableUuid` | 決定論 ID |
| `contracts/legacy/checksum.ts` `canonicalJsonForChecksum` / `computeContentChecksum` | 決定論シリアライズ・checksum |
| `samples/mountain-viaduct-500/*` | E2E 代表ケース（fixture は sample 専用ハードコードにしない） |

## 3. モジュール構成（新規 `frontend/src/bridgeProject/`）

```
frontend/src/bridgeProject/
  types.ts                     # BridgeProjectAlignment / BridgeGeometry / BpValue / 定数
  validation.ts                # fail-closed 検証（finite / 昇順 / span 整合 / NaN 禁止）
  alignmentAdapter.ts          # Phase 3-1: input(Coordinate3dInput) -> BridgeProjectAlignment
  bridgeGeometryGenerator.ts   # Phase 3-2: alignment + piers/spans -> BridgeProjectBridgeGeometry
  cbdmDocument.ts              # CBDM 文書ビルダ + manifest + 決定論 round-trip
  __tests__/                   # 各ユニット + mountain500 E2E + determinism
```

## 4. status 語彙（BpValue → CBDM 対応）

| BpValue | CBDM ResolvedValue | 意味 |
|---------|--------------------|------|
| CONFIRMED | CONFIRMED (+authority) | 入力/原本として確認済み（pier station, skew） |
| DERIVED | DERIVED (+derivedFrom) | モデルから決定論導出（XYZ/azimuth/grade/crossfall/width/length/span） |
| INFERRED | INFERRED (+inferenceBasis) | 推定（現時点では使わない。将来 CASE B） |
| MISSING | HOLD_INSUFFICIENT_SOURCE (+stateReason) | 不足（vertical なしの grade 等） |
| DEFERRED | DEFERRED (+stateReason) | 保留（skew 未指定等） |
| NOT_AUTHORIZED | NOT_AVAILABLE (+stateReason) / 文書レベル numericDesignAuthorization | 未認証（設計値に使用禁止） |

## 5. unit / coordinate 方針

- canonical: **m / rad**。grade=ratio、crossfall=**%**（right_down_positive）、curvature=1/m。
- coordinate: liner global frame（right-handed, x-east/y-north/**z-up**）でサンプリング。
  橋梁 local（x-longitudinal/y-transverse/z-up）は CBDM entity field + manifest sharedFacts で宣言。
- 各 BpValue / CBDM ResolvedValue に unit を付与。silent conversion 禁止。

## 6. 生成ルール（Phase 3-2）

- bridgeStart = 最 upstream abutment（A1）station（CONFIRMED）
- bridgeEnd = 最 downstream abutment（A2）station（CONFIRMED）
- bridgeLength = bridgeEnd − bridgeStart（DERIVED）
- spans: pier draft の span 定義（start/end support）→ length = end − start（DERIVED）。
  span draft が無ければ consecutive supports から導出。
  **span sum ≠ bridgeLength → fail-closed**
- supports: 各 pier に対し station（CONFIRMED）/ skewRad（CONFIRMED or DEFERRED）/
  position・tangent・transverse（DERIVED, alignment から）
- deckWidth: opts 指定 → CONFIRMED / cross-section offsetLines から max 幅 → DERIVED / 無 → MISSING
- **station 昇順・NaN/Infinity 禁止・coordinate 不明 fail-closed**

## 7. PR 分割

| PR | 内容 |
|----|------|
| P0 | 本計画 + inventory |
| P1 | types + validation + alignmentAdapter + tests |
| P2 | bridgeGeometryGenerator + tests |
| P3 | cbdmDocument（CBDM ビルダ + manifest + round-trip）+ tests |
| P4 | mountain500 E2E（determinism / save-load-replay / compatibility）+ tests |
| P5 | docs + closeout + 全 regression + ledger |
