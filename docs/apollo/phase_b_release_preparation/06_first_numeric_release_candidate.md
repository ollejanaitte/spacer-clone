# Phase A+ — 06 最初の数値リリース候補選定（First Numeric Release Candidate）

**Authority:** Phase A+（P5）
**Date:** 2026-08-02
**対象ブロッカー:** GATE-NR-03（Golden 未承認）関連、Phase B 実装開始範囲の最小セル選定
**Integration base:** 04_solver_identity_and_physical_contract.md / 05_golden_validation_execution_plan.md / DS-07 / 08 ゲート語彙（frontend/src/apollo/types.ts）

本ファイルは、Phase B で最初に数値実装を許可する対象（最小セル）を、候補 A〜H の比較から選定する記録である。**本選定は GRANTED を意味しない。** 許可状態は本ファイル末尾の CURRENT_AUTHORIZATION に従う。

---

## 1. 候補 A〜H の定義

| ID | 候補 | TARGET_ENTITY | TARGET_CHECK | 対象 | 対象外 |
|----|------|---------------|--------------|------|--------|
| A | 主桁断面諸量（純幾何） | GirderSectionSegment / MainGirder | geometric_section_properties | 上フランジ・腹板・下フランジ、断面積・図心・断面二次モーメント・断面係数・単位長さ当たり体積 | 材料強度・許容値・抵抗値・曲げ/せん断耐力・座屈・OK/NG判定・利用率・正式設計照査 |
| B | 単純支持主桁の反力・断面力 | MainGirder / AnalysisMember | simple_span_member_actions | 単径間・単純支持・直線梁・単一荷重ケース・支点反力・せん断力・曲げモーメント | たわみ・設計照査・荷重組合せ・活荷重載荷最適化・立体解析・OK/NG判定 |
| C | 主桁曲げ照査 | MainGirder / GirderSectionSegment | main_girder_bending_verification | 解析曲げモーメント・断面特性・材料強度・曲げ抵抗値・利用率・判定 | —（道示R7条項・係数の人間確認が前提） |
| D | 主桁せん断照査 | MainGirder / GirderSectionSegment | main_girder_shear_verification | 解析せん断力・腹板寸法・材料強度・せん断抵抗・腹板安定・利用率・判定 | —（道示R7条項・補剛条件が前提） |
| E | 主桁たわみ照査 | MainGirder / AnalysisMember | main_girder_deflection_serviceability | 解析変位・対象荷重ケース・最大たわみ・許容たわみ・利用率・判定 | —（解析器規約・荷重採択・許容値が前提） |
| F | RC床版照査 | RcDeck | rc_deck_verification | 床版厚・片持床版・主鉄筋・配力鉄筋・支点上補強・曲げ/せん断/使用性 | —（道示R7床版条項・材料・荷重・正式計算例が前提） |
| G | 横桁・補剛材照査 | CrossBeam / Stiffener / SwayBracing / LateralBracing | secondary_member_verification | 横桁断面力・断面照査・対傾構/横構・支点上/中間/水平補剛材・有効長・細長比・安定 | —（主桁解析結果との作用力対応・部材端条件が前提） |
| H | 添接照査 | Splice | splice_connection_verification | 上/下フランジ添接・腹板添接・ボルト・添接板・ピッチ/ゲージ/端距離・作用力分担・接合部判定 | —（ボルト規格・配置規則・道示R7接合部条項が前提） |

---

## 2. 比較表（8 項目 × 1〜5 点）

### 2.1 評価スコア一覧

| # | 基準 | A | B | C | D | E | F | G | H |
|---|------|---|---|---|---|---|---|---|---|
| 1 | 公式設計基準への依存の低さ | 5 | 4 | 1 | 1 | 2 | 1 | 1 | 1 |
| 2 | 解析器への依存の低さ | 5 | 1 | 2 | 2 | 2 | 2 | 1 | 3 |
| 3 | 既存実装との近さ | 5 | 3 | 2 | 2 | 2 | 1 | 1 | 1 |
| 4 | 独立Golden作成の容易さ | 5 | 5 | 2 | 2 | 3 | 1 | 1 | 1 |
| 5 | 誤判定リスクの低さ | 5 | 5 | 1 | 1 | 2 | 1 | 1 | 1 |
| 6 | ユーザー価値 | 5 | 4 | 4 | 3 | 3 | 3 | 2 | 2 |
| 7 | fail-closed実装の容易さ | 5 | 4 | 3 | 3 | 3 | 2 | 2 | 2 |
| 8 | 将来拡張性 | 5 | 4 | 3 | 3 | 3 | 3 | 3 | 2 |
| | **合計** | **40** | **30** | **18** | **17** | **20** | **14** | **12** | **13** |

### 2.2 各点数の根拠（リポジトリ内の事実に基づく）

**A. 主桁断面諸量（純幾何）** — 合計 40
1. 設計基準非依存: 5。`sectionProperties.ts:1-5` に「No design authority is claimed」「always carry NOT_AUTHORIZED semantics」と明記。入力は寸法のみで基準・係数を参照しない。
2. 解析器非依存: 5。`computeGirderSectionProperties(input)` は寸法のみから計算し、backend/engine を呼ばない。
3. 既存実装の近さ: 5。`frontend/src/apollo/bridgeStructure/sectionProperties.ts` に完全実装、`frontend/src/apollo/__tests__/sectionProperties.test.ts` にテストあり（対称断面・非対称断面・fail-closed null）。
4. 独立Golden容易: 5。断面積・図心・断面二次モーメント・断面係数は手計算・表計算で容易。05 §5 の GOLD-MG-003 と対応。
5. 誤判定リスク低: 5。OK/NG を出さない純幾何計算。表示状態も `NOT_AUTHORIZED`（`bridgeStructure/types.ts:88`、`generateBsdd.ts:134`）。
6. ユーザー価値: 5。曲げ・せん断・たわみ・鋼重の共通基盤（`quantities.ts` が断面諸量を利用）。
7. fail-closed容易: 5。非正数・非有限 → `null` を既存テストで確認（`sectionProperties.test.ts:46-57`）。
8. 将来拡張性: 5。C/D/E 照査と鋼重算出で再利用。

**B. 単純支持主桁の反力・断面力** — 合計 30
1. 基準依存低: 4。閉形式の静定解は基準自体に依存しないが、荷重値の正式採択（道示）が最終的には必要。
2. 解析器依存高: 1。支点反力・断面力は解析結果が必須。backend/engine（04 §solver 契約）に依存。
3. 既存実装: 3。backend に `test_engine_verification_cases.py` の閉形式検証（集中・分布荷重）が存在するが、frontend 側に単独の主桁断面力実装はない。
4. 独立Golden容易: 5。集中荷重・等分布荷重の閉形式解（05 §5 GOLD-MG-001/002）で容易。
5. 誤判定リスク低: 5。OK/NG を出さない純計算。
6. ユーザー価値: 4。照査（C/D/E）の入力となる断面力。
7. fail-closed容易: 4。荷重ケース不足の停止は可能だが解析器連動の複雑さが残る。
8. 将来拡張性: 4。曲げ・せん断照査の入力として再利用。

**C. 主桁曲げ照査** — 合計 18
1. 基準依存高: 1。道示R7 の該当条項・式・表・係数の人間確認が未完了（PA-OQ-001、UA-P2-01）。
2. 解析器依存: 2。解析曲げモーメントが必須。
3. 既存実装: 2。照査実装は存在しない。設計状態は `NOT_AUTHORIZED` のみ。
4. 独立Golden容易: 2。限界値・係数の正式採用が必要。
5. 誤判定リスク高: 1。安全性に直接関わる正式判定。
6. ユーザー価値: 4。主要機能。
7. fail-closed: 3。入力不足停止は可能だが、係数の暗黙既定リスク。
8. 将来拡張性: 3。

**D. 主桁せん断照査** — 合計 17
1. 基準依存高: 1。道示R7 条項・補剛条件が前提（UA-P2-01 未完了）。
2. 解析器依存: 2。解析せん断力が必須。
3. 既存実装: 2。腹板せん断・腹板安定の照査実装なし。
4. 独立Golden: 2。補剛条件込みの正式例が必要。
5. 誤判定リスク高: 1。安全性判定。
6. ユーザー価値: 3。
7. fail-closed: 3。
8. 将来拡張性: 3。

**E. 主桁たわみ照査** — 合計 20
1. 基準依存: 2。許容たわみは道示依存。
2. 解析器依存: 2。解析変位が必須（04 §解析器規約の CONFIRMED 後に有効）。
3. 既存実装: 2。実装なし。
4. 独立Golden: 3。閉形式解は可能だが許容値・荷重ケース採択が必要（05 GOLD-MG-007）。
5. 誤判定: 2。使用性照査の判定。
6. ユーザー価値: 3。
7. fail-closed: 3。
8. 将来拡張性: 3。

**F. RC床版照査** — 合計 14
1. 基準依存高: 1。道示R7 床版条項・かぶり・荷重モデルが前提。
2. 解析器依存: 2。版の荷重伝達・支点上補強は解析・荷重モデル依存。
3. 既存実装: 1。床版照査実装なし。
4. 独立Golden: 1。正式計算例・鉄筋モデルが必要（PA-OQ-005 関連）。
5. 誤判定リスク高: 1。
6. ユーザー価値: 3。
7. fail-closed: 2。
8. 将来拡張性: 3。

**G. 横桁・補剛材照査** — 合計 12
1. 基準依存高: 1。細長比・安定の照査式が道示依存。
2. 解析器依存高: 1。主桁解析結果との作用力対応が必須。
3. 既存実装: 1。実装なし。
4. 独立Golden: 1。部材端条件込みの正式例が必要。
5. 誤判定リスク高: 1。
6. ユーザー価値: 2。
7. fail-closed: 2。
8. 将来拡張性: 3。

**H. 添接照査** — 合計 13
1. 基準依存高: 1。ボルト規格・配置規則・道示R7 接合部条項が前提。
2. 解析器依存: 3。作用力分担は主桁断面力の局所参照（解析器不要寄り）。
3. 既存実装: 1。実装なし。
4. 独立Golden: 1。正式計算例が必要。
5. 誤判定リスク高: 1。接合部判定。
6. ユーザー価値: 2。
7. fail-closed: 2。
8. 将来拡張性: 2。

---

## 3. 選定

```
FIRST_RELEASE_CANDIDATE:
A — 主桁断面諸量（純幾何）

TARGET_ENTITY:
GirderSectionSegment / MainGirder

TARGET_CHECK:
geometric_section_properties
```

選定理由:
- 公式設計基準への依存が最も小さい（1 項目 5 点、`sectionProperties.ts` が基準参照なし）
- 解析器が不要（2 項目 5 点）
- VVS02 に既存の sectionProperties 実装がある（3 項目 5 点、実装+テスト確認済み）
- 独立手計算が可能（4 項目 5 点、05 §5 GOLD-MG-003）
- 正式な OK/NG 判定を伴わない（5 項目 5 点、状態は常に NOT_AUTHORIZED）
- 曲げ・せん断・たわみ・鋼重の共通基盤になる（6・8 項目 5 点）

既存コード・文書の調査結果に、A を選べない重大な矛盾は**検出されなかった**。そのため他候補への GRANTED は行わない。

**B 以上（C〜H）は正式照査条件が不足しているため、いずれも GRANTED しない（BLOCKED 相当評価）。** 現時点で B は解析器連動・荷重採択が必要、C〜H は道示条項・材料・正式計算例・独立 Golden が前提のため。

---

## 4. A の許可状態

```
CURRENT_AUTHORIZATION:
NOT_AUTHORIZED
```

- 既存の採択語彙（`frontend/src/apollo/types.ts:20-22`）は `NOT_AUTHORIZED` / `CONDITIONAL` / `AUTHORIZED`。`CONDITIONAL_CANDIDATE` は語彙に存在しないため、既存語彙に合わせて `NOT_AUTHORIZED` を使用する。
- これは既存実装（`sectionProperties.ts:4`、`generateBsdd.ts:134`）の `NOT_AUTHORIZED` と整合する。
- **P5 では GRANTED にしない。**

### 4.1 REQUIRED_EVIDENCE（A を GRANTED へ昇格するための必要証拠）

| # | 必要証拠 | 状態 |
|---|----------|------|
| E1 | 既存 sectionProperties.ts の入力・出力・単位の完全な仕様化 | 未完了 |
| E2 | 対称 I 断面の独立手計算 Golden | 未作成 |
| E3 | 非対称 I 断面の独立手計算 Golden | 未作成 |
| E4 | 断面積・図心・断面二次モーメント・断面係数の照合 | 未実施 |
| E5 | 丸め・許容誤差の決定 | 未実施 |
| E6 | 異常入力・ゼロ・負値・極小値の fail-closed 確認 | 一部確認（null 返却テストは既存） |
| E7 | 単位変換の検証 | 未実施 |
| E8 | 独立確認者の承認 | 未実施 |
| E9 | Decision ID による明示的なセル単位 GRANTED | 未実施 |

### 4.2 RESOLVED_EVIDENCE（既存コード・既存テスト・VVS02 で確認できたもののみ）

| # | 証拠 | 場所 |
|---|------|------|
| R1 | I 形主桁断面の純幾何計算実装（webHeight / 各板面積 / totalArea / centroidFromBottom / secondMomentOfArea / sectionModulusTop/Bottom / steelVolumePerGirder） | `frontend/src/apollo/bridgeStructure/sectionProperties.ts:48-108` |
| R2 | 非正数・非有限・webHeight<=0 → null の fail-closed | `sectionProperties.ts:52-65`、`sectionProperties.test.ts:46-57` |
| R3 | 対称断面で centroid = depth/2、上下断面係数一致の検証 | `sectionProperties.test.ts:59-74` |
| R4 | 非対称断面（上 0.5/下 0.6、厚 0.02/0.025）で totalArea・鋼重の検証 | `sectionProperties.test.ts:24-44` |
| R5 | 入力型（ResolvedBridgeStructureInput）・出力型（GirderSectionProperties）の単位コメント（m, m², m³, m⁴） | `sectionProperties.ts:23-37` |
| R6 | 設計状態は常に NOT_AUTHORIZED（語彙: `apollo/types.ts`、`bridgeStructure/types.ts:88`） | 上記 |

### 4.3 MISSING_EVIDENCE（独立証拠・人間作業）

| # | 欠落証拠 | 内容 |
|---|----------|------|
| M1 | 独立手計算 Golden（対称） | GOLD-MG-003 相当の人間手計算・表計算結果 |
| M2 | 独立手計算 Golden（非対称） | 非対称断面 1 ケース以上（05 §5 指定） |
| M3 | 独立確認者の承認 | 誘導・実行・比較の独立確認と署名 |
| M4 | 正式許可 Decision ID | セル単位 GRANTED の DEC-ID |
| M5 | 丸め・許容誤差の凍結 | tolerance_freeze_register への記録 |
| M6 | 単位変換の検証 | 入力単位（m・mm 等）混在時の変換確認 |

---

## 5. GOLDEN_CASES

```
GOLDEN_CASES:
GOLD-MG-003 を中心とする（05_golden_validation_execution_plan.md §5）。
必要に応じて対称断面（GOLD-MG-003S）と非対称断面（GOLD-MG-003A）に分割する。
```

- GOLD-MG-003（断面諸量の独立手計算）: 断面積 A / Iy / Iz の部材分断・合成規則。対象候補 A の出力（totalArea / centroidFromBottom / secondMomentOfArea / sectionModulusTop/Bottom）と対応。
- 対称断面: 上下フランジ同寸 → centroid = girderDepth/2 の検算。
- 非対称断面: 上下フランジ異寸 → 図心移動・並行軸定理の検算。
- 入力寸法・単位・丸め規則を固定（05 §5.1 / §7 の手続きに従う）。

---

## 6. HUMAN_ACTION

```
HUMAN_ACTION:
独立表計算または手計算結果の作成・確認・署名。
対象: 対称 I 断面・非対称 I 断面の断面積・図心・断面二次モーメント・断面係数。
出力: 05 §10 の独立誘導成果物（誘導メモ・単位換算・比較スクリプト）と承認記録。
```

→ 07_user_action_required.md の UA-P5-01 として登録。

---

## 7. PHASE_B_START_VERDICT

```
PHASE_B_START_VERDICT:
NO_GO_PENDING_INDEPENDENT_GOLDEN
```

Phase B の数値実装開始は、A の独立 Golden（M1/M2）と承認（M3/M4）が揃うまで NO_GO。候補 B〜H は正式照査条件不足により BLOCKED。

---

## 8. P5 検証（Self-check）

| Check | Result |
|-------|--------|
| 候補 A〜H を定義（8 項目×1〜5 点、根拠付き） | PASS |
| A を FIRST_RELEASE_CANDIDATE として選定 | PASS |
| A を GRANTED にしていない（CURRENT_AUTHORIZATION: NOT_AUTHORIZED） | PASS |
| 既存語彙に合わせた許可状態（CONDITIONAL_CANDIDATE は不採用） | PASS |
| REQUIRED / RESOLVED / MISSING 証拠を明示 | PASS |
| 根拠のない点数を付けていない | PASS |
| 既存コード・テスト・VVS02 を書き換えていない | PASS |
| Phase B 数値実装コードを作成していない | PASS |
| 未完の TODO / TBD なし | PASS |

---

## 9. P5 決定（decision_log 反映）

| DEC-ID | Date | Decision |
|--------|------|----------|
| DEC-PB-0007 | 2026-08-02 | 06_first_numeric_release_candidate.md で候補 A〜H を 8 項目で比較し、**A（主桁断面諸量・純幾何）** を FIRST_RELEASE_CANDIDATE に選定。CURRENT_AUTHORIZATION は既存語彙（NOT_AUTHORIZED/CONDITIONAL/AUTHORIZED）に合わせ **NOT_AUTHORIZED** とし、GRANTED は行わない。B〜H は正式照査条件不足で BLOCKED 相当。A の GRANTED には独立手計算 Golden（対称/非対称）、丸め・許容誤差凍結、fail-closed・単位変換検証、独立確認者承認、セル単位 GRANTED の DEC-ID が必要。PHASE_B_START_VERDICT: NO_GO_PENDING_INDEPENDENT_GOLDEN。 |
