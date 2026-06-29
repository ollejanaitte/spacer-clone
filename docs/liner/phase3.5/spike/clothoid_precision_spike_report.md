# PR-1b-0 Clothoid Precision Spike Report

> 作成日: 2026-06-30  
> 関連: Pre-Decision #1, N1 §5, PR-1b-0, PR-1b-5  
> 測定コード: `frontend/src/liner/core/__tests__/clothoidPrecisionSpike.test.ts`

---

## 1. 目的

PR-1b-5（Clothoid Target Accuracy Gate）着手前に、現行 production 実装 `evaluateClothoidElement`（Simpson 128 分割）の endpoint 位置精度を実測し、Pre-Decision #1 の 1 mm 判定基準を満たすかを確認する。

- production 実装（`frontend/src/liner/core/geometry/clothoid.ts`）は**変更しない**
- 測定ロジックは vitest spike test に閉じる
- 参照値は test 内の高分割 Simpson 積分（16384 even intervals）

---

## 2. 測定設計

### 2.1 比較対象

| 項目 | 内容 |
| --- | --- |
| Production | `evaluateClothoidElement(element, L)` — Simpson **128** even intervals（現行実装） |
| Reference | test 内 `referenceEvaluateClothoidEndpoint` — Simpson **16384** even intervals |
| 比較量 | endpoint 座標 `(x, y)` のユークリッド距離誤差 |

### 2.2 クロソイドモデル（N1 §5 準拠）

```text
kappa(s) = k0 + (k1 - k0) * s / L
theta(s) = theta0 + k0*s + 0.5*((k1-k0)/L)*s^2
x(s) = x0 + integral_0^s cos(theta(u)) du
y(s) = y0 + integral_0^s sin(theta(u)) du
```

Reference 実装は production と同一の heading / curvature 式を用い、Simpson 分割数のみを増やす。

### 2.3 評価時間

- 各ケースで endpoint 評価を **1000 回**実行し、1 回あたり平均時間（ms）を記録
- Production / Reference それぞれ独立計測
- vitest 実行時に `console.log` で Markdown 表形式出力

### 2.4 実行方法

```bash
cd frontend
npx vitest run src/liner/core/__tests__/clothoidPrecisionSpike.test.ts
```

---

## 3. 対象ケース

直線（無限半径）→ 有限半径 R への左曲線遷移スパイラル。

| パラメータ | 値 |
| --- | --- |
| 始点半径 | `null`（κ₀ = 0） |
| 終点半径 R | 50, 100, 500, 1000 m |
| クロソイド定数 A | 30, 50, 100, 150 m |
| 曲線長 L | L = A² / R |
| 始点 | (0, 0), azimuth = 0 rad |
| turn | `left` |

**ケース数**: 4 (R) × 4 (A) = **16 ケース**

N1 §5 の Target Accuracy 条件（L ≤ 500 m, A ≥ 30 m）を満たす組合せを網羅する。

---

## 4. 1 mm 判定基準（Pre-Decision #1）

[master_pre_decision_document.md](../master_pre_decision_document.md) Pre-Decision #1:

| 判定 | 条件 |
| --- | --- |
| Simpson 128 継続 | 全 spike ケースで endpoint 位置誤差 **≤ 0.001 m（1 mm）** |
| Fresnel 移行検討 | いずれか 1 ケースでも 1 mm を超える場合（PR-1b-5 停止、Human Decision へ） |

test 内 `expect`:

```typescript
expect(errorM).toBeLessThanOrEqual(0.001); // 各ケース
expect(maxErrorM).toBeLessThanOrEqual(0.001); // 全体 max
```

---

## 5. 実測結果（追記欄）

> vitest 実行後、下表に `console.log` 出力を転記する。

### 5.1 Endpoint 位置誤差・評価時間

| R (m) | A (m) | L (m) | error (m) | error (mm) | prod (ms) | ref (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 30 | 18.000 | 1.458e-10 | 0.0000 | 0.0111 | 1.0023 |
| 50 | 50 | 50.000 | 3.272e-9 | 0.0000 | 0.0082 | 1.0011 |
| 50 | 100 | 200.000 | 3.312e-7 | 0.0003 | 0.0091 | 1.0653 |
| 50 | 150 | 450.000 | 7.161e-6 | 0.0072 | 0.0093 | 0.8886 |
| 100 | 30 | 9.000 | 4.544e-12 | 0.0000 | 0.0068 | 0.7511 |
| 100 | 50 | 25.000 | 9.723e-11 | 0.0000 | 0.0073 | 0.7439 |
| 100 | 100 | 100.000 | 6.544e-9 | 0.0000 | 0.0068 | 0.7508 |
| 100 | 150 | 225.000 | 8.841e-8 | 0.0001 | 0.0071 | 0.7810 |
| 500 | 30 | 1.800 | 1.021e-14 | 0.0000 | 0.0085 | 0.7545 |
| 500 | 50 | 5.000 | 3.375e-14 | 0.0000 | 0.0086 | 0.7558 |
| 500 | 100 | 20.000 | 1.898e-12 | 0.0000 | 0.0085 | 0.7497 |
| 500 | 150 | 45.000 | 2.272e-11 | 0.0000 | 0.0070 | 0.7455 |
| 1000 | 30 | 0.900 | 4.552e-15 | 0.0000 | 0.0070 | 0.7481 |
| 1000 | 50 | 2.500 | 9.770e-15 | 0.0000 | 0.0068 | 0.7453 |
| 1000 | 100 | 10.000 | 6.750e-14 | 0.0000 | 0.0068 | 0.7410 |
| 1000 | 150 | 22.500 | 7.462e-13 | 0.0000 | 0.0069 | 0.7474 |

### 5.2 集計

| 項目 | 値 |
| --- | --- |
| max endpoint error (m) | 7.161e-6 |
| max endpoint error (mm) | 0.0072 |
| Pre-Decision #1 判定 | PASS（Simpson 128 継続） |
| 測定日時 | 2026-06-30 JST |
| vitest コマンド | `npx vitest run src/liner/core/__tests__/clothoidPrecisionSpike.test.ts --reporter=verbose` |

---

## 6. Human Decision 用メモ

| 結果 | 推奨アクション |
| --- | --- |
| 全ケース ≤ 1 mm | PR-1b-5 で Simpson 128 維持実装を継続 |
| いずれか > 1 mm | PR-1b-5 を停止し織田さんへ報告。Fresnel 移行は別 Phase で判断 |

---

## 7. スコープ外

- GC-08 / GC-09 / GC-10 複合 alignment 全体の golden test（PR-1b-5 以降）
- production `clothoid.ts` の変更
- sampling / sagitta / performance smoke（別 PR）
