# Stage 5A Reading Request（外部基準調査への依頼書）

## 1. Stage 5Aの目的
APOLLOマニュアルから、道路橋示方書・JIS・デザインデータブック等と照合が必要な項目と質問を洗い出す。
**実際の外部基準照合（Stage 5B）は行わない。**

## 2. 調査対象
- 起点: `features/feature_catalog.csv` 281機能
- Phase1中心（非合成RC床版鋼鈑桁）
- 原本PDFは読取専用。OCR全文の外部コピー禁止。

## 3. 照合候補件数
- Stage 4起点機能数: **281**
- 外部照合アクション付き機能数: **160**
- 照合行数（traceability rows）: **408**
- 外部調査引渡し行: **273**

## 4. P0項目
件数（EXTERNAL_SOURCE_LOOKUP）: 155

代表質問:
- [APOLLO_MANUAL_ONLY] F4-P1-012 実橋の主桁本数・支間はプロジェクト決定。Phase1対象（4〜6本等）は調査スコープであり基準が一意決定する値ではない。
- [RBS_CONCRETE] F4-P2-001 RC床版/ハンチ「床版厚の指定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-002 RC床版/ハンチ「ハンチ高の設定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-003 RC床版/ハンチ「単位系指定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-004 RC床版/ハンチ「ハンチ形状の設定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-005 RC床版/ハンチ「ハンチ計算結果の設計情報への反映」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-006 RC床版/ハンチ「床版照査位置決定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-007 RC床版/ハンチ「かぶり量の指定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-008 RC床版/ハンチ「配力筋照査の出力方法」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_CONCRETE] F4-P2-009 RC床版/ハンチ「フランジ厚およびハンチ内鉄筋の指定」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。
- [RBS_COMMON] F4-P2-010 「床版設計荷重指定」について、適用年版の道路橋示方書に定義・載荷方法・組合せ規則がどう規定されているか確認する。
- [JIS_REBAR] F4-P2-011 床版鉄筋の種類・規格・呼び名がどのJISに対応するか確認する。
- [RBS_CONCRETE] F4-P2-011 配筋量・かぶり・間隔等の設計規定が道路橋示方書にどうあるか確認する。
- [JIS_REBAR] F4-P2-011 JIS規格値と道路橋示方書の配筋規定を組み合わせて読む必要がある項目を列挙する。
- [RBS_CONCRETE] F4-P2-012 RC床版/ハンチ「計算書出力」の最小厚・支間・張出・照査に関し、適用年版の道路橋示方書（コンクリート関係）規定を確認する。

## 5. P1項目
件数: 118

代表質問:
- [APOLLO_MANUAL_ONLY] F4-P1-007 単位系切替・自動変換有無はAPOLLO仕様として整理する。外部基準の単位定義との対応表が必要かだけ Stage5B で確認する。
- [RBS_COMMON] F4-P1-007 APOLLOが扱う力・長さ・応力の単位系が、適用対象の道路橋示方書の表記・換算慣行と矛盾しないか確認する。
- [APOLLO_MANUAL_ONLY] F4-P1-012 主桁本数上限等のソフト制限はAPOLLO仕様として記録する。
- [APOLLO_MANUAL_ONLY] F4-P1-047 支承条件の入力値（固定/可動等）は工事条件として設計者が与える。基準は制約を与えても一意には定めない。
- [DESIGN_DATA_BOOK] F4-P1-051 標準断面・形鋼選定の推奨がデザインデータブック等にあるか確認する。APOLLOの標準値と同一視しない。
- [RBS_STEEL] F4-P1-051 標準として提示される断面が示方書の幅厚比等を満たす前提になっているか、照合観点を確認する。
- [DESIGN_DATA_BOOK] F4-P2-001 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- [DESIGN_DATA_BOOK] F4-P2-002 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- [DESIGN_DATA_BOOK] F4-P2-004 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- [DESIGN_DATA_BOOK] F4-P2-005 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- [DESIGN_DATA_BOOK] F4-P2-006 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- [DESIGN_MANUAL] F4-P2-013 マニュアルが言及する「鋼道路橋設計便覧方法（死荷重曲げ変局点を算出）」について、該当する設計便覧の該当箇所・適用条件・年版を確認する（適合判定はしない）。

## 6. 道路橋示方書で確認する項目
行数: 156（RBS_COMMON/STEEL/CONCRETE/SUBSTRUCTURE 等）

- RBS_COMMON: unit_system / 単位系選択
- RBS_SUBSTRUCTURE: bearing / 支承条件データ
- RBS_STEEL: standard_section / 単位重量・物理定数データ
- RBS_CONCRETE: slab_thickness / 床版厚の指定
- RBS_CONCRETE: haunch / ハンチ高の設定
- RBS_CONCRETE: haunch / 単位系指定
- RBS_CONCRETE: haunch_geometry / ハンチ形状の設定
- RBS_CONCRETE: haunch_calculation / ハンチ計算結果の設計情報への反映
- RBS_CONCRETE: rc_slab / 床版照査位置決定
- RBS_CONCRETE: rc_slab / かぶり量の指定
- RBS_CONCRETE: rc_slab / 配力筋照査の出力方法
- RBS_CONCRETE: haunch / フランジ厚およびハンチ内鉄筋の指定
- RBS_COMMON: slab_load_input / 床版設計荷重指定
- RBS_CONCRETE: slab_reinforcement_input / 主鉄筋および配力鉄筋の指定
- RBS_CONCRETE: rc_slab / 計算書出力
- RBS_CONCRETE: slab_result_output / 支点補強筋 計算書出力（道路公団形式）
- RBS_CONCRETE: slab_geometry / slab_geometry
- RBS_CONCRETE: slab_support_condition / slab_support_condition
- RBS_CONCRETE: slab_material / slab_material
- RBS_STEEL: section_change / 断面変化位置の追加方法

## 7. JISで確認する項目
行数: 34

- JIS_REBAR: slab_reinforcement_input / 主鉄筋および配力鉄筋の指定
- JIS_REBAR: slab_reinforcement_input / 主鉄筋および配力鉄筋の指定
- JIS_REBAR: slab_material / slab_material
- JIS_REBAR: slab_material / slab_material
- JIS_BOLT: splice / 添接計算の実行
- JIS_BOLT: splice_bolt / フランジボルト配置変更方法1
- JIS_BOLT: splice_bolt / フランジボルト配置変更方法1
- JIS_BOLT: splice_bolt / ボルト本数不足時の再計算
- JIS_BOLT: splice_bolt / フランジボルト配置変更方法2
- JIS_BOLT: splice_plate / 添接板厚不足時の再計算
- JIS_BOLT: splice_bolt / 腹板ボルト配置変更方法
- JIS_BOLT: splice_check / 添接計算実行方法
- JIS_BOLT: splice_geometry / 部材寸法入力
- JIS_BOLT: splice_bolt / ボルト配置の自動決定
- JIS_BOLT: splice_bolt / ボルト配置の変更

## 8. デザインデータブックで確認する項目
行数: 47（DESIGN_DATA_BOOK / DESIGN_MANUAL）

- DESIGN_DATA_BOOK: 単位重量・物理定数データ — 標準断面・形鋼選定の推奨がデザインデータブック等にあるか確認する。APOLLOの標準値と同一視しない。
- DESIGN_DATA_BOOK: 床版厚の指定 — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_DATA_BOOK: ハンチ高の設定 — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_DATA_BOOK: ハンチ形状の設定 — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_DATA_BOOK: ハンチ計算結果の設計情報への反映 — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_DATA_BOOK: 床版照査位置決定 — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_MANUAL: 支点補強筋 計算書出力（国土交通省形式） — マニュアルが言及する「鋼道路橋設計便覧方法（死荷重曲げ変局点を算出）」について、該当する設計便覧の該当箇所・適用条件・年版を確認する（適合判定はしない）。
- DESIGN_DATA_BOOK: 支点補強筋 計算書出力（道路公団形式） — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_DATA_BOOK: slab_geometry — 標準的な床版厚・ハンチ形状の推奨値がデザインデータブック等に示されているか確認する（APOLLO初期値と同一視しない）。
- DESIGN_DATA_BOOK: 対傾構設計 — 標準的な骨組み・形鋼選定の実務推奨をデザインデータブック等で確認する。
- DESIGN_DATA_BOOK: 横構断面指定 — 標準的な骨組み・形鋼選定の実務推奨をデザインデータブック等で確認する。
- DESIGN_DATA_BOOK: 鋼重計算機能 — 割増係数のデフォルトや概算に用いる経験値がデザインデータブック等の推奨とどう関係するか確認する（適合判定はしない）。

## 9. 複数資料が必要な項目
行数: 23

- F4-P2-011 主鉄筋および配力鉄筋の指定 → JIS_REBAR
- F4-P2-018 slab_material → JIS_REBAR
- F4-P3-010 添接計算の実行 → RBS_STEEL
- F4-P3-011 フランジボルト配置変更方法1 → JIS_BOLT
- F4-P3-014 添接板厚不足時の再計算 → RBS_STEEL
- F4-P3-017 添接計算実行方法 → RBS_STEEL
- F4-P3-027 部材寸法入力 → RBS_STEEL
- F4-P3-037 girder_material → JIS_STEEL

## 10. Historical Baselineで必要な資料
- マニュアルに基準名が明示された例: 鋼道路橋設計便覧（年版未記載 → UNKNOWN）
- 明示行数（NAME_STATED_EDITION_UNKNOWN）: 2
- 大半の項目は `historical_edition_status=UNKNOWN`（推測禁止）

## 11. Target Standardで必要な資料
- 全行 `target_edition_status=NOT_SELECTED`（408行）
- 将来OSS採用年版は本Stageでは選定しない

## 12. OCRで画像確認が必要な項目
ocr_risk HIGH/MEDIUM 行数: 51
（抽出テキストが無い/薄い、または manual_id=UNKNOWN/MULTI）

## 13. 非Blocking Unknown
UNKNOWN / NEEDS_REVIEW 行: 15
詳細: `stage5a_unresolved_questions.md`

## 14. Blocking候補
`blocking_for_design=YES` 行: 148
意味: 設計凍結前に Stage5B 照合が必要な候補。Stage5A失敗ではない。

## 15. 外部調査プロジェクトへの依頼事項
1. `stage5a_external_research_handoff.csv` の質問のみを使用すること
2. APOLLO原本・OCR全文をコピーしないこと
3. 適合判定・数値の正誤判定・年版推測をしないこと
4. 出力は「条文・表・適用条件の所在メモ」に限定
5. Historical と Target を分け、Target は未選定のまま返すこと
